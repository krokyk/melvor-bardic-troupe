export const mastery118Cost = 100_000_000;

// Music stores Banjo as Drum, Snare Drum as Banjo, and Djembe as Bongo.
const preservation = [
  ["Guitar", "ammoPreservationChance"],
  ["Drum", "foodPreservationChance"],
  ["Banjo", "runePreservationChance"],
  ["Accordion", "consumablePreservationChance"],
  ["Bouzouki", "soulPointPreservationChance"],
  ["Flute", "altMagicRunePreservationChance"],
  ["Saxophone", "unholyPrayerPointPreservationChance"],
  ["Violin", "prayerPointPreservationChance"],
  ["French_Horn", "summoningChargePreservationChance"],
  ["Harp", "potionChargePreservationChance"],
  ["Tambourine", "compostPreservationChance"],
];

export function installMastery118(ctx, music, troupe, namespace) {
  if (!cloudManager.hasTotHEntitlementAndIsEnabled) return;
  const game = music.game;
  const unlocked = new Set();
  const tiers = new Set();
  const rewards = preservation.map(([id, modifier]) => [`mythMusic:${id}`, { [modifier]: 50 }]);
  // Flat HP uses the game's tenfold normal-mode scaling: 10 grants 100 Hitpoints.
  rewards.push([`${namespace}:Cello`, { flatMaxHitpoints: 10, summoningAttackInterval: -25 }]);
  for (const [id, modifiers] of rewards) {
    const instrument = music.actions.getObjectByID(id);
    if (!instrument) continue;
    for (const mode of ["standard", "hardcore"]) {
      const tier = new StatObject({}, game, "Bardic Troupe Mastery 118");
      tier.modifiers = game.getModifierValuesFromData(modifiers);
      tier.level = 118;
      instrument.modifiers(mode).push(tier);
    }
    tiers.add(instrument);
  }

  ctx.patch(music.constructor, "masteryLevelCap").get(function (original) {
    return Math.max(original(), 118);
  });
  ctx.patch(music.manager.constructor, "isModifierActive").replace(function (original, instrument, modifier) {
    if (modifier.level === 118 && tiers.has(instrument)) return unlocked.has(instrument.id);
    return original(instrument, modifier);
  });

  const isAvailable = instrument => tiers.has(instrument) && !unlocked.has(instrument.id) &&
    music.isMasteryActionUnlocked(instrument) && music.getMasteryLevel(instrument) >= 118;

  function open(instrument) {
    if (!isAvailable(instrument)) return;
    const essence = game.items.getObjectByID("mythMusic:Essence_Of_Music");
    const canAfford = () => game.gp.canAfford(mastery118Cost) && game.bank.getQty(essence) >= 1;
    const modifier = music.manager.getModifiers(instrument).find(modifier => modifier.level === 118);
    return SwalLocale.fire({
      titleText: `${instrument.name}: Mastery 118`,
      html: `<p>${modifier.description}</p><p>100,000,000 GP + 1 Essence of Music</p>`,
      showCancelButton: true, cancelButtonText: "Back", confirmButtonText: "Unlock",
      showConfirmButton: canAfford(),
      preConfirm() {
        if (!isAvailable(instrument) || !canAfford()) {
          SwalLocale.showValidationMessage("Requires Mastery 118, 100,000,000 GP, and 1 Essence of Music.");
          return false;
        }
        game.bank.removeItemQuantityByID(essence.id, 1, true);
        game.gp.remove(mastery118Cost);
        unlocked.add(instrument.id);
        troupe.refresh();
        return true;
      },
    });
  }

  ctx.patch(music.constructor, "unlockMastery").replace(function (original, instrument) {
    if (!tiers.has(instrument)) return original(instrument);
    const fire = SwalLocale.fire;
    SwalLocale.fire = function (options) {
      let observer;
      return fire.call(this, {
        ...options,
        didOpen(popup) {
          options.didOpen?.call(this, popup);
          const row = document.createElement("div");
          row.className = "manage-section upgrade with-bottom-border bardic-troupe-mastery118";
          const description = document.createElement("div");
          description.className = unlocked.has(instrument.id) ? "myth-info font-size-sm text-success" : "myth-info font-size-sm myth-text-grey";
          description.innerHTML = `Mastery 118: ${music.manager.getModifiers(instrument).find(modifier => modifier.level === 118).description}`;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn btn-lg btn-success ml-2";
          button.textContent = unlocked.has(instrument.id) ? "Unlocked" : "Unlock";
          button.disabled = !isAvailable(instrument);
          button.setAttribute("aria-label", `${instrument.name}: Mastery 118`);
          button.onclick = () => open(instrument);
          row.append(description, button);
          const append = () => {
            const manage = popup.querySelector(".myth-music-mastery .manage");
            if (manage && !manage.contains(row)) manage.insertBefore(row, manage.lastElementChild);
          };
          observer = new MutationObserver(append);
          observer.observe(popup, { childList: true, subtree: true });
          append();
        },
        didClose(...args) {
          observer?.disconnect();
          options.didClose?.apply(this, args);
        },
      });
    };
    try { return original(instrument); }
    finally { SwalLocale.fire = fire; }
  });

  return {
    open,
    save() { return [...unlocked]; },
    restore(saved) {
      unlocked.clear();
      if (!Array.isArray(saved)) return;
      for (const id of saved) {
        if (typeof id === "string" && tiers.has(music.actions.getObjectByID(id))) unlocked.add(id);
      }
    },
  };
}

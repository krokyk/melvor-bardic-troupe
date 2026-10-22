export const masteryCosts = new Map([[20, 100_000], [40, 1_000_000], [65, 10_000_000], [99, 100_000_000]]);

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

export function installMasteryTiers(ctx, music, troupe, namespace) {
  const game = music.game;
  const unlocked = new Set();
  const tiers = new Set();
  const levels = new Map([[40, 20], [75, 40], [99, 65]]);
  // Keep tier positions stable so Music's saved purchases retain their rewards.
  for (const instrument of music.actions.allObjects) {
    for (const mode of ["standard", "hardcore"]) {
      for (const tier of instrument.modifiers(mode)) tier.level = levels.get(tier.level) ?? tier.level;
    }
  }
  const rewards = preservation.map(([id, modifier]) => [`mythMusic:${id}`, { [modifier]: 50 }]);
  rewards.push([`${namespace}:Cello`, { summoningAttackInterval: -25, attackInterval: -10 }]);
  for (const [id, modifiers] of rewards) {
    const instrument = music.actions.getObjectByID(id);
    if (!instrument) continue;
    for (const mode of ["standard", "hardcore"]) {
      const tier = new StatObject({}, game, "Bardic Troupe Mastery 99");
      tier.modifiers = game.getModifierValuesFromData(modifiers);
      tier.level = 99;
      const bonuses = instrument.modifiers(mode);
      bonuses.splice(bonuses.findIndex(bonus => bonus.level === 999), 0, tier);
    }
    tiers.add(instrument);
  }

  ctx.patch(music.manager.constructor, "isModifierActive").replace(function (original, instrument, modifier) {
    if (modifier.level === 99 && tiers.has(instrument)) return unlocked.has(instrument.id);
    return original(instrument, modifier);
  });

  function open(instrument, level) {
    const cost = masteryCosts.get(level);
    if (!cost || !instrument || music.actions.getObjectByID(instrument.id) !== instrument) return;
    const bonus = () => music.manager.getModifiers(instrument).find(modifier => modifier.level === level);
    const isAvailable = () => {
      const modifier = bonus();
      return modifier && !modifier.isActive && !modifier.isUpgrade &&
        music.isMasteryActionUnlocked(instrument) && music.getMasteryLevel(instrument) >= level;
    };
    if (!isAvailable()) return;
    const essence = game.items.getObjectByID("mythMusic:Essence_Of_Music");
    const canAfford = () => game.gp.canAfford(cost) && game.bank.getQty(essence) >= 1;
    return SwalLocale.fire({
      titleText: `${instrument.name}: Mastery ${level}`,
      html: `<p>${bonus().description}</p><p>${cost.toLocaleString("en-US")} GP + 1 Essence of Music</p>`,
      showCancelButton: true, cancelButtonText: "Back", confirmButtonText: "Unlock",
      showConfirmButton: canAfford(),
      preConfirm() {
        if (!isAvailable() || !canAfford()) {
          SwalLocale.showValidationMessage(`Requires Mastery ${level}, ${cost.toLocaleString("en-US")} GP, and 1 Essence of Music.`);
          return false;
        }
        game.bank.removeItemQuantityByID(essence.id, 1, true);
        game.gp.remove(cost);
        if (level === 99) unlocked.add(instrument.id);
        else {
          const index = instrument.modifiers(music.settings.modifierType).findIndex(modifier => modifier.level === level);
          music.masteriesUnlocked.get(instrument)[index] = true;
        }
        troupe.refresh();
        return true;
      },
    });
  }

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

import { namespace } from "./troupe.mjs";

export function createCelloData() {
  const bonuses = [
    { level: 1, modifiers: {
      ammoPreservationChance: 50, runePreservationChance: 50, foodPreservationChance: 50,
      prayerPointPreservationChance: 50, summoningChargePreservationChance: 50, flatPrayerPointCost: -3,
    } },
    { level: 40, modifiers: { critChance: 20, critMultiplier: 100, lifesteal: 10 } },
    { level: 75, modifiers: {
      flatResistance: [{ damageTypeID: "melvorD:Normal", value: 20 }], evasion: 100,
    } },
    { level: 99, modifiers: { accuracyRating: 100, maxHit: 100, minHitBasedOnMaxHit: 20, attackInterval: -20 } },
    { level: 999, modifiers: { [`${namespace}:thirdPrayer`]: 1 } },
  ];
  return {
    namespace,
    data: {
      modifiers: [{
        id: "thirdPrayer", isCombat: true, allowEnemy: false, allowNegative: false,
        allowedScopes: [{ scopes: {}, descriptions: [{ text: "Allows a third active Prayer (maximum 3).", above: 0 }] }],
      }],
      skillData: [{ skillID: "mythMusic:Music", data: { instruments: [{
        id: "Cello", name: "Cello", media: "assets/cello.png", level: 118,
        baseInterval: 3000, baseExperience: 547, maxGP: 705,
        skills: ["Attack", "Strength", "Ranged", "Magic", "Defence", "Hitpoints", "Prayer", "Summoning"].map(id => `melvorD:${id}`),
        standardModifiers: bonuses, hardcoreModifiers: bonuses,
      }] } }],
    },
  };
}

export async function installCello(ctx, music, isReady) {
  if (!cloudManager.hasTotHEntitlementAndIsEnabled) return;
  await ctx.gameData.addPackage(createCelloData());
  loadedLangJson.Myth_Music_Instrument_Cello = "Cello";
  const instrument = music.actions.getObjectByID(`${namespace}:Cello`);
  const game = music.game;
  const player = game.combat.player;
  const hasThirdPrayer = () => music.level >= instrument.level && music.bards.get(instrument)?.isUpgraded === true;
  const sameBook = (first, prayer) => first.isUnholy === prayer.isUnholy && first.isAbyssal === prayer.isAbyssal;

  // Music's completion getters count only its own namespace.
  const base = Object.getPrototypeOf(music.constructor.prototype);
  for (const method of ["getMaxTotalMasteryLevels", "getTotalCurrentMasteryLevels"]) {
    ctx.patch(music.constructor, method).after(function (result) {
      return result + base[method].call(this, namespace);
    });
  }

  function refreshPrayers() {
    player.manager.computeAllStats();
    game.renderQueue.activeSkills = true;
    player.renderQueue.prayerSelection = true;
  }

  function reconcilePrayers() {
    if (!isReady()) return;
    const limit = hasThirdPrayer() ? 3 : 2;
    let changed = false;
    for (const set of player.equipmentSets) {
      for (const prayer of [...set.prayerSelection].slice(limit)) {
        set.prayerSelection.delete(prayer);
        changed = true;
      }
    }
    if (changed) refreshPrayers();
  }
  ctx.patch(music.constructor, "computeProvidedStats").after(reconcilePrayers);

  ctx.patch(player.constructor, "togglePrayer").replace(function (original, prayer, render = true) {
    if (this !== player || !hasThirdPrayer() || this.activePrayers.size < 2 || this.activePrayers.has(prayer)) {
      return original(prayer, render);
    }
    if (![...this.activePrayers].every(active => sameBook(active, prayer))) {
      notifyPlayer(game.prayer, getLangString("INVALID_PRAYER_BOOK_SELECTED"), "danger");
      return;
    }
    if (this.activePrayers.size >= 3) {
      notifyPlayer(game.prayer, "You cannot activate more than 3 Prayers at once.", "danger");
      return;
    }
    if (!this.canEnablePrayer(prayer)) return;
    this.activePrayers.add(prayer);
    refreshPrayers();
    if (render) this.render();
  });

  ctx.patch(player.constructor, "encode").replace(function (original, ...args) {
    if (this !== player) return original(...args);
    // Keep the third Prayer in addon storage so saves remain safe without the addon.
    const selections = this.equipmentSets.map(set => set.prayerSelection);
    try {
      this.equipmentSets.forEach((set, index) => { set.prayerSelection = new Set([...selections[index]].slice(0, 2)); });
      return original(...args);
    } finally {
      this.equipmentSets.forEach((set, index) => { set.prayerSelection = selections[index]; });
    }
  });

  return {
    savePrayers() { return player.equipmentSets.map(set => [...set.prayerSelection][2]?.id); },
    restorePrayers(saved) {
      reconcilePrayers();
      if (!hasThirdPrayer() || !Array.isArray(saved)) return;
      let changed = false;
      for (const [index, id] of saved.entries()) {
        if (typeof id !== "string") continue;
        const set = player.equipmentSets[index];
        const prayer = game.prayers.getObjectByID(id);
        if (!set || !prayer || set.prayerSelection.size !== 2 || set.prayerSelection.has(prayer) ||
            ![...set.prayerSelection].every(active => sameBook(active, prayer))) continue;
        if (index === player.selectedEquipmentSet && !player.canEnablePrayer(prayer)) continue;
        set.prayerSelection.add(prayer);
        changed = true;
      }
      if (changed) refreshPrayers();
    },
  };
}

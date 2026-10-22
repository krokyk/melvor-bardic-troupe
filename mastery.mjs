export const masteryCosts = new Map([[20, 100_000], [40, 1_000_000], [65, 10_000_000], [99, 100_000_000]]);

// Music stores Banjo as Drum, Snare Drum as Banjo, and Djembe as Bongo.
// Each entry maps Music's original 40/75/99 rewards and supplies its extra tier.
const layout = [
  ["Guitar", [65, 40, 99], { level: 20, modifiers: { ammoPreservationChance: 50 } }],
  ["Drum", [40, 65, 99], { level: 20, modifiers: { foodPreservationChance: 50 } }],
  ["Banjo", [20, 65, 99], { level: 40, modifiers: { runePreservationChance: 50 } }],
  ["Accordion", [20, 65, 99], { level: 40, modifiers: { consumablePreservationChance: 50 } }],
  ["Bouzouki", [20, 99, 40], { level: 65, modifiers: { soulPointPreservationChance: 50 } }],
  ["Flute", [40, 20, 99], { level: 65, modifiers: { skillXP: [{ skillID: "melvorAoD:Archaeology", value: 15 }] } }],
  ["Maraca", [20, 40, 99], { level: 65, modifiers: { skillInterval: [{ skillID: "melvorD:Crafting", value: -10 }] } }],
  ["Xylophone", [20, 99, 40], { level: 65, modifiers: { masteryXP: [{ skillID: "melvorD:Agility", value: 15 }] } }],
  ["Saxophone", [40, 99, 20], { level: 65, modifiers: { unholyPrayerPointPreservationChance: 50 } }],
  ["Violin", [20, 40, 99], { level: 65, modifiers: { prayerPointPreservationChance: 50 } }],
  ["Bongo", [40, 20, 99], { level: 65, conditionalModifiers: [{
    condition: { type: "FightingSlayerTask" },
    modifiers: { flatResistance: [{ damageTypeID: "melvorD:Normal", value: 3 }] },
    description: "+3% Damage Reduction while fighting your Slayer Task.",
  }] }],
  ["French_Horn", [20, 65, 99], { level: 40, modifiers: { summoningChargePreservationChance: 50 } }],
  ["Harp", [20, 99, 65], { level: 40, modifiers: { potionChargePreservationChance: 50 } }],
  ["Tambourine", [99, 40, 65], { level: 20, modifiers: { compostPreservationChance: 50 } }],
  ["Trumpet", [20, 40, 99], { level: 65, modifiers: { critChance: 5 } }],
  ["Cello", [20, 40, 65], { level: 99, modifiers: { summoningAttackInterval: -25, attackInterval: -10 } }],
];

export function installMasteryTiers(ctx, music, troupe, namespace) {
  const game = music.game;
  const unlocked = new Set();
  const extraTiers = new Set();
  const instruments = new Set();
  // Keep tier positions stable so Music's saved purchases retain their rewards.
  for (const [id, levels, extra] of layout) {
    const instrument = music.actions.getObjectByID(`${id === "Cello" ? namespace : "mythMusic"}:${id}`);
    if (!instrument) continue;
    const remap = new Map([[40, levels[0]], [75, levels[1]], [99, levels[2]]]);
    for (const mode of ["standard", "hardcore"]) {
      const bonuses = instrument.modifiers(mode);
      for (const tier of bonuses) tier.level = remap.get(tier.level) ?? tier.level;
      const tier = new StatObject(extra, game, "Bardic Troupe mastery reward");
      if (extra.modifiers) tier.modifiers = game.getModifierValuesFromData(extra.modifiers);
      tier.level = extra.level;
      bonuses.splice(bonuses.findIndex(bonus => bonus.level === 999), 0, tier);
      extraTiers.add(tier);
    }
    instruments.add(instrument);
  }

  ctx.patch(music.manager.constructor, "isModifierActive").replace(function (original, instrument, modifier) {
    if (extraTiers.has(modifier)) return unlocked.has(instrument.id);
    return original(instrument, modifier);
  });
  ctx.patch(music.manager.constructor, "getModifiers").after(function (result) {
    return result.sort((first, second) => first.level - second.level);
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
        const bonuses = instrument.modifiers(music.settings.modifierType);
        const index = bonuses.findIndex(modifier => modifier.level === level);
        if (extraTiers.has(bonuses[index])) unlocked.add(instrument.id);
        else music.masteriesUnlocked.get(instrument)[index] = true;
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
        if (typeof id === "string" && instruments.has(music.actions.getObjectByID(id))) unlocked.add(id);
      }
    },
  };
}

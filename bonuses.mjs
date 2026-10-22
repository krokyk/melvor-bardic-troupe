// Music stores Banjo as Drum, Snare Drum as Banjo, and Djembe as Bongo.
const distribution = [
  ["Guitar", 1, "skillItemDoublingChance"],
  ["Drum", 1, "skillPreservationChance"],
  ["Drum", 40, "skillItemDoublingChance"],
  ["Banjo", 1, "skillItemDoublingChance"],
  ["Banjo", 40, "skillPreservationChance"],
  ["Accordion", 1, "skillPreservationChance"],
  ["Bouzouki", 20, "skillItemDoublingChance"],
  ["Bouzouki", 65, "skillPreservationChance"],
  ["Flute", 65, "skillPreservationChance"],
  ["Maraca", 20, "skillItemDoublingChance"],
  ["Maraca", 999, "skillPreservationChance"],
  ["Xylophone", 20, "skillPreservationChance"],
  ["Saxophone", 65, "skillItemDoublingChance"],
  ["Violin", 20, "skillPreservationChance"],
  ["Violin", 65, "skillItemDoublingChance"],
  ["Bongo", 999, "skillItemDoublingChance"],
  ["French_Horn", 40, "skillPreservationChance"],
  ["Harp", 40, "skillItemDoublingChance"],
  ["Tambourine", 999, "skillItemDoublingChance"],
  ["Trumpet", 999, "skillPreservationChance"],
];

export async function installSkillBonuses(ctx, music, troupe) {
  // Register the global skill-only scope before parsing any new modifier values.
  await ctx.gameData.addPackage({ modifications: { modifiers: [{
    id: "melvorD:skillItemDoublingChance",
    allowedScopes: [{ scopes: {}, descriptions: [{ text: "+${value}% Chance to Double Items in Skills", above: 0, includeSign: false }] }],
  }] } });

  const additions = new Map();
  for (const [id, level, modifier] of distribution) {
    const instrument = music.actions.getObjectByID(`mythMusic:${id}`);
    if (!instrument) continue;
    for (const mode of ["standard", "hardcore"]) {
      const stats = instrument.modifiers(mode).find(stats => stats.level === level);
      if (!stats) throw new Error(`Bardic Troupe could not find ${instrument.id} bonus tier ${level}.`);
      additions.set(stats, music.game.getModifierValuesFromData({ [modifier]: 5 })[0]);
    }
  }

  let enabled = false;
  const name = "extra-preservation-and-doubling";
  const settings = ctx.settings.section("Bardic Troupe");
  settings.add({
    type: "switch", name, label: "Extra preservation and doubling", default: false,
    hint: "Enable added Chance to Double Items in Skills and Chance to Preserve Resources in Skills across instrument tiers (up to +50 percentage points each). Music's original bonus values are unchanged. Applies immediately to this character.",
    onChange(value) {
      if (typeof value !== "boolean") return "Choose ON or OFF.";
      if (value === enabled) return;
      for (const [stats, addition] of additions) {
        const modifiers = (stats.modifiers ?? []).filter(modifier => modifier !== addition);
        if (value) modifiers.push(addition);
        stats.modifiers = modifiers.length ? modifiers : undefined;
      }
      enabled = value;
      troupe.refresh();
    },
  });

  return {
    applySaved() { settings.set(name, settings.get(name) === true); },
    // Native settings retain values omitted by an older save during QuickLoad.
    resetForLoad() { settings.set(name, false); },
  };
}

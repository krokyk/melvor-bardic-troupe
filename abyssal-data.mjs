const realm = "melvorItA:Abyssal";
const damageTypes = [realm, "melvorItA:Eternal"];
const skillID = name => `${["Harvesting", "Corruption"].includes(name) ? "melvorItA" : "melvorD"}:${name}`;
const scoped = (names, value) => names.map(name => ({ skillID: skillID(name), realmID: realm, value }));
const experience = names => names.map(name => ({ skillID: skillID(name), value: 10 }));
const abyssalCombat = (modifiers, description) => ({
  condition: { type: "Some", conditions: damageTypes.map(damageType => ({ type: "DamageType", character: "Player", damageType })) },
  modifiers, description,
});

export function createAbyssalData(namespace) {
  const instruments = [
    {
      id: "Abyssal_Guitar", name: "Abyssal Guitar", icon: "guitar", abyssalLevel: 1,
      baseAbyssalExperience: 600, maxGP: 60, skills: ["Woodcutting", "Firemaking", "Farming"],
      bonuses: [
        { level: 1, modifiers: { abyssalSkillXP: experience(["Woodcutting", "Firemaking", "Farming"]) } },
        { level: 20, modifiers: { skillInterval: scoped(["Woodcutting", "Firemaking"], -10) } },
        { level: 40, modifiers: { randomProductChance: [
          { skillID: "melvorD:Woodcutting", itemID: "melvorItA:Shadow_Raven_Nest", value: 2 },
          { skillID: "melvorD:Woodcutting", itemID: "melvorItA:Shadow_Drake_Nest", value: 1 },
        ] } },
        { level: 65, modifiers: { flatAdditionalPrimaryProductQuantity: scoped(["Woodcutting", "Firemaking"], 1) } },
        { level: 99, modifiers: { flatBaseRandomProductQuantity: [
          { skillID: "melvorD:Woodcutting", itemID: "melvorItA:Shadow_Raven_Nest", value: 2 },
          { skillID: "melvorD:Woodcutting", itemID: "melvorItA:Shadow_Drake_Nest", value: 1 },
        ] } },
        { level: 999, modifiers: {
          woodcuttingAXPAddedAsFiremakingAXP: 25,
          flatAdditionalPrimaryProductQuantity: scoped(["Farming"], 5),
        } },
      ],
    },
    {
      id: "Abyssal_Drum", name: "Abyssal Banjo", icon: "banjo", abyssalLevel: 8,
      baseAbyssalExperience: 1500, maxGP: 150, skills: ["Fishing", "Cooking"],
      bonuses: [
        { level: 1, modifiers: { abyssalSkillXP: experience(["Fishing", "Cooking"]) } },
        { level: 20, modifiers: { skillInterval: scoped(["Fishing", "Cooking"], -10) } },
        { level: 40, modifiers: { flatAdditionalPrimaryProductQuantity: scoped(["Fishing", "Cooking"], 1) } },
        { level: 65, modifiers: { masteryXP: scoped(["Fishing", "Cooking"], 15) } },
        { level: 99, modifiers: { fishingAdditionalSpecialItemChance: [{ realmID: realm, value: 20 }] } },
        { level: 999, modifiers: {
          foodHealingValue: damageTypes.map(damageTypeID => ({ damageTypeID, value: 20 })),
          basePrimaryProductQuantity: scoped(["Cooking"], 20),
        } },
      ],
    },
    {
      id: "Abyssal_Banjo", name: "Abyssal Snare Drum", icon: "snare-drum", abyssalLevel: 16,
      baseAbyssalExperience: 3500, maxGP: 350, skills: ["Mining", "Smithing", "Harvesting"],
      bonuses: [
        { level: 1, modifiers: { abyssalSkillXP: experience(["Mining", "Smithing", "Harvesting"]) } },
        { level: 20, modifiers: { skillInterval: scoped(["Mining", "Smithing", "Harvesting"], -10) } },
        { level: 40, modifiers: { flatHarvestingIntensity: 1, doubleHarvestingIntensityChance: 10 } },
        { level: 65, modifiers: { abyssalGemChance: 5, additionalAbyssalGemChance: 10 } },
        { level: 99, modifiers: { flatAdditionalPrimaryProductQuantity: [
          ...scoped(["Mining"], 2), ...scoped(["Harvesting"], 1),
        ] } },
        { level: 999, modifiers: {
          harvestingUniqueProductChance: 10, "melvorItA:noHarvestingIntensityDecay": 1,
          flatAdditionalPrimaryProductQuantity: scoped(["Smithing"], 2),
        } },
      ],
    },
    {
      id: "Abyssal_Maraca", name: "Abyssal Maracas", icon: "maracas", abyssalLevel: 24,
      baseAbyssalExperience: 7000, maxGP: 700, skills: ["Fletching", "Crafting"],
      bonuses: [
        { level: 1, modifiers: { abyssalSkillXP: experience(["Fletching", "Crafting"]) } },
        { level: 20, modifiers: { skillInterval: scoped(["Fletching", "Crafting"], -10) } },
        { level: 40, modifiers: { skillCostReduction: scoped(["Fletching", "Crafting"], 10) } },
        { level: 65, modifiers: { flatBasePrimaryProductQuantity: scoped(["Fletching", "Crafting"], 1) } },
        { level: 99, modifiers: { flatAdditionalPrimaryProductQuantity: scoped(["Fletching", "Crafting"], 3) } },
        { level: 999, modifiers: {
          additionalRandomAbyssalGemChance: scoped(["Crafting"], 10),
          additionalRandomFragmentChance: scoped(["Fletching"], 10),
        } },
      ],
    },
    {
      id: "Abyssal_Violin", name: "Abyssal Violin", icon: "violin", abyssalLevel: 32,
      baseAbyssalExperience: 13000, maxGP: 1300, skills: ["Runecrafting", "Prayer"],
      bonuses: [
        { level: 1, modifiers: { abyssalSkillXP: experience(["Runecrafting", "Prayer"]) } },
        { level: 20, modifiers: { skillInterval: scoped(["Runecrafting"], -10) } },
        { level: 40, modifiers: { flatAdditionalPrimaryProductQuantity: [{
          skillID: "melvorD:Runecrafting", realmID: realm, subcategoryID: "melvorF:Runes", value: 6,
        }] } },
        { level: 65, modifiers: { soulPointCost: -20, soulPointPreservationChance: 50 } },
        { level: 99, modifiers: { flatSoulPointsFromReleasing: 5 } },
        { level: 999, conditionalModifiers: [abyssalCombat(
          { flatSoulPointsWhenHit: 5, flatSoulPointsPerMonsterKill: 25 },
          "When using ${condDamageType0} or ${condDamageType1}: +${modValue0} Soul Points when hit and +${modValue1} Soul Points per Monster kill.",
        )] },
      ],
    },
    {
      id: "Abyssal_French_Horn", name: "Abyssal French Horn", icon: "french-horn", abyssalLevel: 40,
      baseAbyssalExperience: 22000, maxGP: 2200, skills: ["Astrology", "Summoning", "Agility"],
      bonuses: [
        { level: 1, modifiers: { abyssalSkillXP: experience(["Astrology", "Summoning", "Agility"]) } },
        { level: 20, modifiers: { skillInterval: scoped(["Astrology", "Summoning", "Agility"], -10) } },
        { level: 40, modifiers: { starFallChance: 1 } },
        { level: 65, modifiers: { flatBasePrimaryProductQuantity: scoped(["Summoning"], 5) } },
        { level: 99, modifiers: {
          flatBaseRandomProductQuantity: [{ skillID: "melvorD:Astrology", itemID: "melvorItA:Abyssal_Stardust", value: 2 }],
          masteryXP: scoped(["Agility"], 15),
        } },
        { level: 999, modifiers: {
          agilityObstacleCost: [{ realmID: realm, value: -15 }],
          flatBasePrimaryProductQuantity: scoped(["Summoning"], 10),
        } },
      ],
    },
    {
      id: "Abyssal_Harp", name: "Abyssal Harp", icon: "harp", abyssalLevel: 48,
      baseAbyssalExperience: 35000, maxGP: 3500, skills: ["Thieving", "Herblore", "Township"],
      bonuses: [
        { level: 1, modifiers: { abyssalSkillXP: experience(["Thieving", "Herblore", "Township"]) } },
        { level: 20, modifiers: {
          thievingStealth: [{ realmID: realm, value: 100 }],
          currencyGain: [{ currencyID: "melvorItA:AbyssalPieces", value: 10 }],
        } },
        { level: 40, modifiers: {
          skillInterval: scoped(["Herblore"], -10), flatAdditionalPrimaryProductQuantity: scoped(["Herblore"], 1),
        } },
        { level: 65, modifiers: { thievingAreaUniqueChance: [{ realmID: realm, value: 10 }] } },
        { level: 99, modifiers: { abyssalWaveAPGain: 20, abyssalWaveASCGain: 10 } },
        { level: 999, modifiers: {
          flatAdditionalPrimaryProductQuantity: scoped(["Herblore"], 3),
          currencyGain: [{ currencyID: "melvorItA:AbyssalPieces", value: 10 }],
        } },
      ],
    },
    {
      id: "Abyssal_Conductor", name: "Abyssal Conductor", icon: "conductor", abyssalLevel: 60,
      baseAbyssalExperience: 60000, maxGP: 6000,
      skills: ["Attack", "Strength", "Ranged", "Magic", "Defence", "Hitpoints", "Slayer", "Corruption"],
      bonuses: [
        { level: 1, modifiers: {
          maxHitpoints: damageTypes.map(damageTypeID => ({ damageTypeID, value: 10 })), abyssalCombatSkillXP: 10,
        } },
        { level: 20, conditionalModifiers: [abyssalCombat(
          { critChance: 10, critMultiplier: 50, lifesteal: 5 },
          "When using ${condDamageType0} or ${condDamageType1}: +${modValue0}% critical hit chance, +${modValue1}% critical hit multiplier, and +${modValue2}% lifesteal.",
        )] },
        { level: 40, modifiers: { flatResistance: [{ damageTypeID: realm, value: 10 }] },
          conditionalModifiers: [abyssalCombat({ evasion: 50 }, "When using ${condDamageType0} or ${condDamageType1}: +${modValue0}% Global Evasion.")] },
        { level: 65, conditionalModifiers: [abyssalCombat(
          { accuracyRating: 50, maxHit: 50, minHitBasedOnMaxHit: 10 },
          "When using ${condDamageType0} or ${condDamageType1}: +${modValue0}% Accuracy Rating, +${modValue1}% Maximum Hit, and +${modValue2}% of Maximum Hit added to Minimum Hit.",
        )] },
        { level: 99, conditionalModifiers: [abyssalCombat(
          { attackInterval: -10, summoningAttackInterval: -25, corruptionCounterRate: 25, bonusCorruptionChance: 10 },
          "When using ${condDamageType0} or ${condDamageType1}: -${modValue0}% Attack Interval, -${modValue1}% Summoning Familiar Attack Interval, +${modValue2}% Corruption progress per hit, and +${modValue3}% chance for a second Corruption effect.",
        )] },
        { level: 999, modifiers: {
          [`${namespace}:thirdPrayer`]: 1, flatAbyssalSlayerAreaEffectNegation: 25,
          currencyGain: [{ currencyID: "melvorItA:AbyssalSlayerCoins", value: 40 }],
        }, enemyModifiers: { flatResistance: [{ damageTypeID: realm, value: -10 }] } },
      ],
    },
  ].map(({ icon, bonuses, skills, ...instrument }) => ({
    ...instrument, realm, level: 99, baseInterval: 3000, baseExperience: 0,
    media: `assets/abyssal/${icon}.png`, skills: skills.map(skillID),
    standardModifiers: bonuses, hardcoreModifiers: bonuses,
  }));
  return {
    namespace,
    data: { skillData: [{ skillID: "mythMusic:Music", data: {
      hasAbyssalLevels: true, abyssalLevelRealm: realm, instruments,
    } }] },
  };
}

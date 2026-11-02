import assert from "node:assert/strict";
import test from "node:test";
import { createAbyssalData } from "./abyssal-data.mjs";

const namespace = "KrokyBardicTroupe", realm = "melvorItA:Abyssal";
const damageTypes = [realm, "melvorItA:Eternal"];
const packageData = () => createAbyssalData(namespace).data.skillData[0].data;

// Scope contracts from Melvor's assets/data/melvorDemo.json and melvorItA.json.
const nativeScopes = new Map([
  ["abyssalSkillXP", ["", "skill"]],
  ["skillInterval", ["", "skill", "action,skill", "realm,skill", "realm"]],
  ["randomProductChance", ["item,skill", "action,item,skill"]],
  ["flatAdditionalPrimaryProductQuantity", ["", "skill", "action,skill", "realm", "realm,skill", "category,skill", "realm,skill,subcategory", "skill,subcategory"]],
  ["flatBaseRandomProductQuantity", ["item,skill"]],
  ["woodcuttingAXPAddedAsFiremakingAXP", [""]],
  ["masteryXP", ["", "skill", "realm", "realm,skill"]],
  ["fishingAdditionalSpecialItemChance", ["", "realm"]],
  ["foodHealingValue", ["", "damageType", "action"]],
  ["basePrimaryProductQuantity", ["skill", "action,skill", "category,skill", "realm,skill", "category,realm,skill"]],
  ["flatHarvestingIntensity", [""]],
  ["doubleHarvestingIntensityChance", [""]],
  ["abyssalGemChance", [""]],
  ["additionalAbyssalGemChance", [""]],
  ["harvestingUniqueProductChance", [""]],
  ["melvorItA:noHarvestingIntensityDecay", ["", "action"]],
  ["skillCostReduction", ["", "skill", "realm", "realm,skill", "category,skill", "skill,subcategory"]],
  ["flatBasePrimaryProductQuantity", ["skill", "realm,skill", "action,skill", "category,skill", "skill,subcategory"]],
  ["additionalRandomAbyssalGemChance", ["skill", "skill,subcategory", "action,skill", "category,skill", "realm,skill"]],
  ["additionalRandomFragmentChance", ["skill", "skill,subcategory", "action,skill", "category,skill", "realm,skill"]],
  ["soulPointCost", [""]],
  ["soulPointPreservationChance", [""]],
  ["flatSoulPointsFromReleasing", [""]],
  ["flatSoulPointsWhenHit", [""]],
  ["flatSoulPointsPerMonsterKill", [""]],
  ["starFallChance", [""]],
  ["agilityObstacleCost", ["", "realm", "action"]],
  ["thievingStealth", ["", "action", "realm"]],
  ["currencyGain", ["currency", "currency,skill", "action,currency,skill"]],
  ["thievingAreaUniqueChance", ["", "realm"]],
  ["abyssalWaveAPGain", [""]],
  ["abyssalWaveASCGain", [""]],
  ["maxHitpoints", ["", "damageType"]],
  ["abyssalCombatSkillXP", [""]],
  ["critChance", [""]],
  ["critMultiplier", [""]],
  ["lifesteal", [""]],
  ["flatResistance", ["damageType"]],
  ["evasion", [""]],
  ["accuracyRating", [""]],
  ["maxHit", [""]],
  ["minHitBasedOnMaxHit", [""]],
  ["attackInterval", [""]],
  ["summoningAttackInterval", [""]],
  ["corruptionCounterRate", [""]],
  ["bonusCorruptionChance", [""]],
  ["flatAbyssalSlayerAreaEffectNegation", [""]],
  [`${namespace}:thirdPrayer`, [""]],
]);

function checkModifiers(modifiers = {}) {
  for (const [id, values] of Object.entries(modifiers)) {
    assert(nativeScopes.has(id), `Unknown modifier ${id}`);
    for (const value of Array.isArray(values) ? values : [{ value: values }]) {
      assert(Number.isFinite(value.value), `${id} has a nonnumeric value`);
      const scopes = Object.keys(value).filter(key => key !== "value").map(key => {
        assert(key.endsWith("ID"), `Unknown modifier scope ${key}`);
        return key.slice(0, -2);
      }).sort().join(",");
      assert(nativeScopes.get(id).includes(scopes), `${id} does not accept ${scopes}`);
      if (value.realmID !== undefined) assert.equal(value.realmID, realm);
      if (value.damageTypeID !== undefined) assert(damageTypes.includes(value.damageTypeID));
      if (value.currencyID !== undefined) assert(["melvorItA:AbyssalPieces", "melvorItA:AbyssalSlayerCoins"].includes(value.currencyID));
      if (value.itemID !== undefined) assert([
        "melvorItA:Shadow_Raven_Nest", "melvorItA:Shadow_Drake_Nest", "melvorItA:Abyssal_Stardust",
      ].includes(value.itemID));
      if (value.subcategoryID !== undefined) assert.equal(value.subcategoryID, "melvorF:Runes");
    }
  }
}

test("Abyssal Music registers eight prefixed instruments with its own native level track and complete mastery rewards", () => {
  const data = createAbyssalData(namespace);
  assert.equal(data.namespace, namespace);
  assert.equal(data.data.skillData[0].skillID, "mythMusic:Music");
  assert.equal(data.modifications, undefined);
  assert.equal(packageData().hasAbyssalLevels, true);
  assert.equal(packageData().abyssalLevelRealm, realm);
  const instruments = packageData().instruments;
  assert.deepEqual(instruments.map(instrument => instrument.name), [
    "Abyssal Guitar", "Abyssal Banjo", "Abyssal Snare Drum", "Abyssal Maracas",
    "Abyssal Violin", "Abyssal French Horn", "Abyssal Harp", "Abyssal Conductor",
  ]);
  assert.equal(new Set(instruments.map(instrument => instrument.id)).size, 8);
  assert.deepEqual(instruments.map(instrument => instrument.abyssalLevel), [1, 8, 16, 24, 32, 40, 48, 60]);
  for (const instrument of instruments) {
    assert.equal(instrument.realm, realm);
    assert.equal(instrument.level, 99);
    assert.equal(instrument.baseExperience, 0);
    assert(instrument.baseAbyssalExperience > 0);
    assert(instrument.maxGP > 0);
    assert.equal(instrument.baseInterval, 3000);
    assert.match(instrument.media, /^assets\/abyssal\/[a-z-]+\.png$/);
    assert.deepEqual(instrument.standardModifiers.map(bonus => bonus.level), [1, 20, 40, 65, 99, 999]);
    assert.deepEqual(instrument.hardcoreModifiers, instrument.standardModifiers);
  }
});

test("Abyssal rewards use native modifier scopes and Abyssal resource IDs without altering ordinary rewards", () => {
  for (const instrument of packageData().instruments) {
    for (const tier of instrument.standardModifiers) {
      checkModifiers(tier.modifiers);
      checkModifiers(tier.enemyModifiers);
      for (const conditional of tier.conditionalModifiers ?? []) {
        assert.deepEqual(conditional.condition, {
          type: "Some", conditions: damageTypes.map(damageType => ({ type: "DamageType", character: "Player", damageType })),
        });
        checkModifiers(conditional.modifiers);
        checkModifiers(conditional.enemyModifiers);
        assert(conditional.description.includes("${condDamageType0} or ${condDamageType1}"), "Conditional bonuses need both visible damage types");
        const values = Object.values(conditional.modifiers).flat();
        const described = [...conditional.description.matchAll(/\$\{modValue(\d+)\}/g)].map(match => Number(match[1]));
        assert.deepEqual(described, values.map((_, index) => index), "Every conditional bonus needs a native description value");
      }
    }
  }
  const serialized = JSON.stringify(packageData());
  for (const normalReference of ["melvorD:Normal", "melvorD:GP", "melvorD:SlayerCoins", "melvorD:Bird_Nest", "melvorD:Rune_Essence"]) {
    assert(!serialized.includes(normalReference), `Unexpected ordinary reward ${normalReference}`);
  }
});

test("the Conductor supplies Abyssal resistance, gated major combat stats, Corruption and Slayer support, and one third-prayer unlock", () => {
  const conductor = packageData().instruments.at(-1), tiers = conductor.standardModifiers;
  assert.deepEqual(tiers[0].modifiers.maxHitpoints, damageTypes.map(damageTypeID => ({ damageTypeID, value: 10 })));
  assert.deepEqual(tiers[2].modifiers.flatResistance, [{ damageTypeID: realm, value: 10 }]);
  assert.equal(tiers[1].conditionalModifiers[0].modifiers.critChance, 10);
  assert.equal(tiers[3].conditionalModifiers[0].modifiers.maxHit, 50);
  assert.equal(tiers[4].conditionalModifiers[0].modifiers.summoningAttackInterval, -25);
  assert(tiers[4].conditionalModifiers[0].modifiers.corruptionCounterRate > 0);
  assert.equal(tiers[5].modifiers[`${namespace}:thirdPrayer`], 1);
  assert(tiers[5].modifiers.flatAbyssalSlayerAreaEffectNegation > 0);
  assert.deepEqual(tiers[5].enemyModifiers.flatResistance, [{ damageTypeID: realm, value: -10 }]);
});

test("Abyssal Violin grants Soul Point preservation once at Mastery 65 alongside its existing cost reduction", () => {
  const instruments = packageData().instruments;
  const violin = instruments.find(instrument => instrument.id === "Abyssal_Violin");
  for (const mode of ["standardModifiers", "hardcoreModifiers"]) {
    const awards = instruments.flatMap(instrument => instrument[mode]
      .filter(tier => tier.modifiers?.soulPointPreservationChance !== undefined)
      .map(tier => ({ instrument: instrument.id, level: tier.level, value: tier.modifiers.soulPointPreservationChance })));
    assert.deepEqual(awards, [{ instrument: violin.id, level: 65, value: 50 }]);
    assert.equal(violin[mode].find(tier => tier.level === 65).modifiers.soulPointCost, -20);
  }
});

test("Abyssal and Eternal weapons receive one combat package while Normal weapons receive none", () => {
  const instruments = packageData().instruments;
  const conductor = instruments.at(-1), violin = instruments.find(instrument => instrument.id === "Abyssal_Violin");
  for (const instrument of [conductor, violin]) {
    for (const tier of instrument.standardModifiers.filter(tier => tier.conditionalModifiers)) {
      assert.equal(tier.conditionalModifiers.length, 1, "A shared condition prevents duplicate combat awards");
      const conditional = tier.conditionalModifiers[0];
      for (const damageType of [...damageTypes, "melvorD:Normal"]) {
        const matches = conditional.condition.conditions.filter(condition => condition.damageType === damageType);
        assert.equal(matches.length, damageTypes.includes(damageType) ? 1 : 0);
      }
    }
  }
  const banjo = instruments.find(instrument => instrument.id === "Abyssal_Drum");
  assert.deepEqual(banjo.standardModifiers.at(-1).modifiers.foodHealingValue, damageTypes.map(damageTypeID => ({ damageTypeID, value: 20 })));
});

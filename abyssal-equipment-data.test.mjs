import assert from "node:assert/strict";
import test from "node:test";
import { abyssalEquipment, createAbyssalEquipmentData } from "./abyssal-equipment-data.mjs";

const namespace = "KrokyBardicTroupe", realm = "melvorItA:Abyssal", music = "mythMusic:Music";
// Native ingredient IDs from Melvor's assets/data/melvorItA.json.
const nativeMaterials = new Set([
  "melvorItA:Abyssal_Essence", "melvorItA:Weak_Soul", "melvorItA:Nightopal", "melvorItA:Shadowpearl",
  "melvorItA:Moonstone", "melvorItA:Abyssal_Stardust", "melvorItA:Twisted_Tendril",
  "melvorItA:Abyssal_Leather", "melvorItA:Abyssal_Firemaking_Oil",
]);

test("seven distinct Abyssal materials cover one upgrade, three sockets, and three utilities", () => {
  const data = createAbyssalEquipmentData(namespace);
  assert.equal(data.namespace, namespace);
  assert.equal(abyssalEquipment.length, 7);
  assert.equal(data.data.items.length, 7);
  assert.equal(new Set(data.data.items.map(item => item.id)).size, 7);
  assert.deepEqual(abyssalEquipment.map(item => item.state), ["upgrade", "socket", "socket", "socket", "utility", "utility", "utility"]);
  assert.equal(new Set(abyssalEquipment.map(item => item.type)).size, 7, "legacy attachments map to exactly one new item each");
  for (const item of data.data.items) {
    assert.equal(item.itemType, "Item");
    assert.match(item.media, /^assets\/abyssal\/[a-z-]+\.png$/);
    assert.equal(item.sellsForCurrency, "melvorItA:AbyssalPieces");
    assert.equal(item.ignoreCompletion, true);
    assert.equal(item.obtainFromItemLog, false);
    assert(item.customDescription.length > 0);
  }
});

test("every enhancement has a repeatable AP exchange using only verified Abyssal resources", () => {
  const data = createAbyssalEquipmentData(namespace).data;
  assert.equal(data.shopPurchases.length, data.items.length);
  for (const purchase of data.shopPurchases) {
    const item = data.items.find(item => purchase.id === `Equipment_${item.id}`);
    assert(item, `Unknown purchased enhancement ${purchase.id}`);
    assert.equal(purchase.category, `${namespace}:AbyssalMusicEquipment`);
    assert.deepEqual(purchase.contains.items, [{ id: `${namespace}:${item.id}`, quantity: 1 }]);
    assert.equal(purchase.cost.currencies.length, 1);
    assert.equal(purchase.cost.currencies[0].currency, "melvorItA:AbyssalPieces");
    assert(purchase.cost.currencies[0].cost > 0);
    assert(purchase.cost.items.length > 0);
    for (const material of purchase.cost.items) {
      assert(nativeMaterials.has(material.id), `Non-Abyssal or unknown material ${material.id}`);
      assert(Number.isSafeInteger(material.quantity) && material.quantity > 0);
    }
    assert.equal(purchase.allowQuantityPurchase, true);
    assert.equal(purchase.defaultBuyLimit, 0);
    assert.deepEqual(purchase.unlockRequirements, []);
    assert.deepEqual(purchase.purchaseRequirements, [
      { type: "DungeonCompletion", dungeonID: "melvorItA:Into_The_Abyss", count: 1 },
      { type: "AbyssalLevel", skillID: music, level: 1 },
    ]);
  }
  const essence = data.shopPurchases[0];
  assert.deepEqual(essence.cost.items, [{ id: "melvorItA:Abyssal_Essence", quantity: 1000 }, { id: "melvorItA:Weak_Soul", quantity: 50 }]);
  assert.equal(essence.cost.currencies[0].cost, 1_000_000);
  assert.deepEqual(data.shopDisplayOrder[0].ids, data.shopPurchases.map(purchase => `${namespace}:${purchase.id}`));
});

test("shop unlock entries obey the native purchase-reference contract rather than accepting generic requirements", () => {
  // ShopPurchase constructs every unlock entry as ShopPurchaseRequirement; generic requirements belong in purchaseRequirements.
  const validate = purchases => {
    for (const purchase of purchases) for (const requirement of purchase.unlockRequirements) {
      assert.equal(requirement.type, "ShopPurchase");
      assert.match(requirement.purchaseID, /^[^:]+:.+$/);
      assert(Number.isSafeInteger(requirement.count) && requirement.count > 0);
    }
  };
  const purchases = createAbyssalEquipmentData(namespace).data.shopPurchases;
  validate(purchases);
  const malformed = structuredClone(purchases);
  malformed[0].unlockRequirements.push({ type: "DungeonCompletion", dungeonID: "melvorItA:Into_The_Abyss", count: 1 });
  assert.throws(() => validate(malformed), assert.AssertionError);
});

test("socket and leather rewards target Abyssal Music without normal XP, global AP, or positive interval penalties", () => {
  const byID = new Map(abyssalEquipment.map(item => [item.id, item]));
  assert.deepEqual(byID.get("Polished_Nightopal_Gem").modifiers, {
    currencyGain: [{ currencyID: "melvorItA:AbyssalPieces", skillID: music, value: 5 }],
  });
  assert.deepEqual(byID.get("Polished_Shadowpearl_Gem").modifiers, { abyssalSkillXP: [{ skillID: music, value: 5 }] });
  assert.deepEqual(byID.get("Polished_Moonstone_Gem").modifiers, { masteryXP: [{ skillID: music, realmID: realm, value: 5 }] });
  assert.deepEqual(byID.get("Pristine_Abyssal_Leather").modifiers, { skillInterval: [{ skillID: music, realmID: realm, value: -5 }] });
  assert.deepEqual(byID.get("Abyssal_String").modifiers, {});
  assert.match(byID.get("Abyssal_String").description, /additional Sheet Music while training Abyssal Music/);
  assert.deepEqual(byID.get("Abyssal_Oil").modifiers, {});
  assert.match(byID.get("Abyssal_Oil").description, /rare drops, mastery tokens, ancient relics, pets, and Summoning marks/);
  assert(!abyssalEquipment.some(item => "skillXP" in item.modifiers));
});

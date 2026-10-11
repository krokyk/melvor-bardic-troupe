import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { configureUpgrades } from "./config.mjs";

afterEach(() => { delete globalThis.ShopCostsAndUnlock; });

function fixture(count = 3) {
  const gp = { amount: 1_000_000_000 };
  const otherCurrency = {};
  const music = { level: 99, virtualLevel: 150, isUnlocked: true, bards: new Map([[1, { instrument: "Lute", isUpgraded: true }]]) };
  const purchased = new Map();
  const purchases = [];
  for (let index = 0; index < count; index++) {
    const previous = purchases.at(-1);
    const level = {
      type: "SkillLevel", level: 100, skill: music,
      isMet() { return this.skill.isUnlocked && this.skill.level >= this.level; },
      getNodes(imageClass) { assert.equal(imageClass, "skill-icon-xs m-1"); return [`Requires Music level ${this.level}`]; },
    };
    const prerequisite = {
      type: "ShopPurchase", purchase: previous, count: 1,
      isMet() { return (purchased.get(this.purchase) ?? 0) >= this.count; },
    };
    purchases.push({
      id: `KrokyBardicTroupe:Slot_${index + 1}`,
      costs: { currencies: [{ currency: otherCurrency, cost: 7 }, { currency: gp, cost: 500_000_000 }] },
      purchaseRequirements: previous ? [prerequisite, level] : [level],
    });
  }
  globalThis.ShopCostsAndUnlock = class {
    constructor(purchase) {
      this.purchase = purchase;
      this.requirementElements = purchase.purchaseRequirements.map(() => ({
        cost: { children: [], updates: 0, replaceChildren(...children) { this.children = children; this.updates++; } },
      }));
    }
    updatePurchaseRequirements() { this.met = this.purchase.purchaseRequirements.every(requirement => requirement.isMet()); }
  };
  const fields = new Map();
  const settings = {
    add(config) { fields.set(config.name, { config, value: config.default }); },
    get(name) { return fields.get(name).value; },
    set(name, value) {
      const field = fields.get(name);
      const error = field.config.onChange(value, field.value);
      if (typeof error === "string") return error;
      field.value = value;
    },
    restore(name, value) { fields.get(name).value = value; },
  };
  const game = { gp, music, shop: { renderQueue: {}, upgradesPurchased: purchased } };
  const config = configureUpgrades({
    settings: { section(name) { assert.equal(name, "Bardic Troupe"); return settings; } },
    patch(Class, method) {
      const original = Class.prototype[method];
      return { after(callback) { Class.prototype[method] = function (...args) {
        const result = original.apply(this, args);
        return callback.call(this, result, ...args) ?? result;
      }; } };
    },
  }, game, purchases);
  const level = purchase => purchase.purchaseRequirements.find(requirement => requirement.type === "SkillLevel");
  const price = purchase => purchase.costs.currencies.find(cost => cost.currency === gp).cost;
  return { game, purchases, purchased, fields, settings, level, price, ...config };
}

test("shared native settings cover every slot, retain other currencies and update render flags", () => {
  const m = fixture();
  assert.equal(m.fields.size, 2);
  assert.equal(m.settings.get("troupe-slot-price"), 500_000_000);
  assert.equal(m.settings.get("troupe-slot-level"), 100);
  m.settings.set("troupe-slot-price", 234);
  m.settings.set("troupe-slot-level", 99);
  for (const purchase of m.purchases) {
    assert.equal(m.price(purchase), 234);
    assert.equal(m.level(purchase).level, 99);
    assert.equal(purchase.costs.currencies[0].cost, 7);
  }
  assert.deepEqual(m.game.shop.renderQueue, { costs: true, requirements: true });
});

test("validation accepts free slots and safe integers, rejecting invalid edits without mutations", () => {
  const m = fixture();
  m.settings.set("troupe-slot-price", 0);
  m.settings.set("troupe-slot-level", 1);
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "10", undefined]) {
    assert.equal(typeof m.settings.set("troupe-slot-price", value), "string");
    assert.equal(typeof m.settings.set("troupe-slot-level", value), "string");
    assert.equal(m.settings.get("troupe-slot-price"), 0);
    assert.equal(m.settings.get("troupe-slot-level"), 1);
    for (const purchase of m.purchases) {
      assert.equal(m.price(purchase), 0);
      assert.equal(m.level(purchase).level, 1);
    }
  }
  assert.equal(typeof m.settings.set("troupe-slot-level", 0), "string");
  m.settings.set("troupe-slot-price", Number.MAX_SAFE_INTEGER);
  m.settings.set("troupe-slot-level", Number.MAX_SAFE_INTEGER);
  assert.equal(m.price(m.purchases[0]), Number.MAX_SAFE_INTEGER);
  assert.equal(m.level(m.purchases[0]).level, Number.MAX_SAFE_INTEGER);
});

test("restored settings apply to every purchase and invalid saved values reset to defaults", () => {
  const m = fixture();
  m.settings.restore("troupe-slot-price", 0);
  m.settings.restore("troupe-slot-level", 80);
  m.applySaved();
  for (const purchase of m.purchases) {
    assert.equal(m.price(purchase), 0);
    assert.equal(m.level(purchase).level, 80);
  }
  m.settings.restore("troupe-slot-price", -100);
  m.settings.restore("troupe-slot-level", 99.5);
  m.applySaved();
  assert.equal(m.settings.get("troupe-slot-price"), 500_000_000);
  assert.equal(m.settings.get("troupe-slot-level"), 100);
  for (const purchase of m.purchases) {
    assert.equal(m.price(purchase), 500_000_000);
    assert.equal(m.level(purchase).level, 100);
  }
});

test("native eligibility uses actual unlocked Music level while sequential prerequisites and ownership survive edits", () => {
  const m = fixture();
  const [first, second] = m.purchases;
  const prerequisite = second.purchaseRequirements[0];
  const hires = [...m.game.music.bards];
  const canBuy = purchase => !m.purchased.has(purchase) && m.game.gp.amount >= m.price(purchase) &&
    purchase.purchaseRequirements.every(requirement => requirement.isMet());
  assert.equal(canBuy(first), false, "virtual level 150 does not bypass actual level 99");
  m.settings.set("troupe-slot-level", 99);
  m.settings.set("troupe-slot-price", 123);
  assert.equal(canBuy(second), false, "the prior slot remains required");
  m.game.music.isUnlocked = false;
  assert.equal(canBuy(first), false);
  m.game.music.isUnlocked = true;
  m.game.gp.amount = 122;
  assert.equal(canBuy(first), false);
  m.game.gp.amount = 123;
  assert.equal(canBuy(first), true);
  m.game.gp.amount -= m.price(first);
  m.purchased.set(first, 1);
  m.settings.set("troupe-slot-price", 0);
  assert.equal(canBuy(second), true);
  m.settings.set("troupe-slot-level", 120);
  assert.equal(canBuy(second), false);
  assert.equal(second.purchaseRequirements[0], prerequisite);
  assert.equal(prerequisite.purchase, first);
  assert.equal(prerequisite.count, 1);
  assert.equal(m.purchased.get(first), 1);
  assert.equal(m.game.gp.amount, 0, "lower prices do not refund prior purchases");
  assert.deepEqual([...m.game.music.bards], hires);
});

test("shop, confirmation and quick-buy labels cache per view and refresh the correct level element only", () => {
  const m = fixture();
  const purchase = m.purchases[1];
  const views = Array.from({ length: 3 }, () => new ShopCostsAndUnlock(purchase));
  const unrelated = new ShopCostsAndUnlock({ purchaseRequirements: [{ isMet: () => true }] });
  unrelated.updatePurchaseRequirements();
  assert.equal(unrelated.requirementElements[0].cost.updates, 0);
  for (const view of views) {
    view.updatePurchaseRequirements();
    view.updatePurchaseRequirements();
    assert.equal(view.requirementElements[0].cost.updates, 0);
    assert.equal(view.requirementElements[1].cost.updates, 1);
    assert.deepEqual(view.requirementElements[1].cost.children, ["Requires Music level 100"]);
  }
  m.purchased.set(m.purchases[0], 1);
  m.settings.set("troupe-slot-level", 99);
  for (const view of views) {
    view.updatePurchaseRequirements();
    assert.equal(view.met, true);
    assert.equal(view.requirementElements[1].cost.updates, 2);
    assert.deepEqual(view.requirementElements[1].cost.children, ["Requires Music level 99"]);
  }
  m.settings.set("troupe-slot-price", 0);
  for (const view of views) {
    view.updatePurchaseRequirements();
    assert.equal(view.requirementElements[1].cost.updates, 2);
  }
});

test("one-instrument Music installs settings and restores defaults without generated purchases", () => {
  const m = fixture(0);
  m.settings.restore("troupe-slot-price", "bad");
  m.settings.restore("troupe-slot-level", undefined);
  m.applySaved();
  assert.equal(m.settings.get("troupe-slot-price"), 500_000_000);
  assert.equal(m.settings.get("troupe-slot-level"), 100);
  m.settings.set("troupe-slot-price", 0);
  m.settings.set("troupe-slot-level", 1);
  assert.equal(m.purchases.length, 0);
});

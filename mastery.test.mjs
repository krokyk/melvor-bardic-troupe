import assert from "node:assert/strict";
import test from "node:test";
import { installMasteryTiers, masteryCosts } from "./mastery.mjs";
import { namespace } from "./troupe.mjs";

function fixture(t, { enabled = true, cap = 99, missing = [], native = [true, true, true, true] } = {}) {
  const globals = ["cloudManager", "StatObject", "SwalLocale"];
  const previous = new Map(globals.map(key => [key, globalThis[key]]));
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  globalThis.cloudManager = { hasTotHEntitlementAndIsEnabled: enabled };
  globalThis.StatObject = class {
    describePlain() { return JSON.stringify(this.modifiers); }
  };
  const swal = globalThis.SwalLocale = {
    fire(options) { this.options = options; return options; },
    showValidationMessage(message) { this.error = message; },
  };
  const ids = ["Guitar", "Drum", "Banjo", "Accordion", "Bouzouki", "Flute", "Maraca", "Xylophone", "Saxophone", "Violin", "Bongo", "French_Horn", "Harp", "Tambourine", "Trumpet"];
  const instruments = ids.filter(id => !missing.includes(id)).map(id => ({ id: `mythMusic:${id}`, name: id, level: 1 }));
  if (enabled) instruments.push({ id: `${namespace}:Cello`, name: "The Conductor", level: 118 });
  for (const instrument of instruments) {
    const modes = Object.fromEntries(["standard", "hardcore"].map(mode => [mode, [1, 40, 75, 99, 999].map(level => ({ level }))]));
    instrument.modifiers = mode => modes[mode];
  }
  const essence = { id: "mythMusic:Essence_Of_Music" };
  const game = {
    gp: { amount: masteryCosts.get(99), canAfford(cost) { return this.amount >= cost; }, remove(cost) { this.amount -= cost; } },
    bank: { quantity: 1, getQty(item) { assert.equal(item, essence); return this.quantity; }, removeItemQuantityByID(id, quantity) { assert.equal(id, essence.id); this.quantity -= quantity; } },
    items: { getObjectByID: id => id === essence.id ? essence : undefined },
    getModifierValuesFromData: data => Object.entries(data).map(([id, value]) => ({ modifier: { id }, value })),
  };
  class Music {
    get masteryLevelCap() { return cap; }
    getMasteryLevel(instrument) { return this.masteryLevels.get(instrument) ?? 1; }
    isMasteryActionUnlocked(instrument) { return this.isUnlocked && this.level >= instrument.level; }
    unlockMastery(instrument) { return SwalLocale.fire({ titleText: instrument.name, didOpen() {} }); }
  }
  class Manager {
    isModifierActive(instrument, modifier) {
      return music.masteriesUnlocked.get(instrument)[instrument.modifiers("standard").indexOf(modifier)] === true;
    }
    getModifiers(instrument) {
      return instrument.modifiers("standard").map(modifier => ({
        level: modifier.level, isActive: this.isModifierActive(instrument, modifier), isUpgrade: modifier.level === 999,
        description: modifier.describePlain?.() ?? "Native bonus",
      }));
    }
    calculateHireCost(instrument) { return music.masteriesUnlocked.get(instrument).filter(Boolean).length; }
  }
  const music = Object.assign(new Music(), {
    level: 120, isUnlocked: true, game, manager: new Manager(), masteryLevels: new Map(), settings: { modifierType: "standard" },
    actions: { allObjects: instruments, getObjectByID: id => instruments.find(instrument => instrument.id === id) },
    masteriesUnlocked: new Map(instruments.map(instrument => [instrument, [...native]])),
  });
  let refreshes = 0;
  const controller = installMasteryTiers({
    patch(Class, name) {
      assert.equal(name, "isModifierActive", "mastery caps are not patched");
      const descriptor = Object.getOwnPropertyDescriptor(Class.prototype, name);
      return {
        replace(fn) { Class.prototype[name] = function (...args) { return fn.call(this, descriptor.value.bind(this), ...args); }; },
      };
    },
  }, music, { refresh() { refreshes++; } }, namespace);
  return { controller, music, game, instruments, swal, refreshes: () => refreshes };
}

test("tiers remap to 1/20/40/65/99 without raising the cap and retain eleven preservation awards", t => {
  const f = fixture(t);
  const expected = {
    Guitar: "ammoPreservationChance", Drum: "foodPreservationChance", Banjo: "runePreservationChance",
    Accordion: "consumablePreservationChance", Bouzouki: "soulPointPreservationChance", Flute: "altMagicRunePreservationChance",
    Saxophone: "unholyPrayerPointPreservationChance", Violin: "prayerPointPreservationChance", French_Horn: "summoningChargePreservationChance",
    Harp: "potionChargePreservationChance", Tambourine: "compostPreservationChance",
  };
  assert.equal(f.music.masteryLevelCap, 99);
  for (const instrument of f.instruments) {
    for (const mode of ["standard", "hardcore"]) {
      const tiers = instrument.modifiers(mode);
      assert.deepEqual(tiers.slice(0, 4).map(tier => tier.level), [1, 20, 40, 65]);
      assert.equal(tiers.at(-1).level, 999);
      const tier = tiers.find(tier => tier.level === 99);
      const modifier = expected[instrument.name];
      if (modifier) assert.deepEqual(tier.modifiers, [{ modifier: { id: modifier }, value: 50 }]);
      else if (instrument.name === "The Conductor") assert.deepEqual(tier.modifiers, [
        { modifier: { id: "summoningAttackInterval" }, value: -25 },
        { modifier: { id: "attackInterval" }, value: -10 },
      ]);
      else assert.equal(tier, undefined);
    }
  }
  assert.deepEqual(f.instruments.filter(instrument => !instrument.modifiers("standard").some(tier => tier.level === 99)).map(instrument => instrument.name), ["Maraca", "Xylophone", "Bongo", "Trumpet"]);
});

test("purchases recheck mastery, unlocks, resources, and duplicate confirmations without changing native hiring tiers", t => {
  const f = fixture(t);
  const instrument = f.instruments[0];
  assert.equal(f.controller.open(instrument, 99), undefined);
  f.music.masteryLevels.set(instrument, 99);
  const tier = instrument.modifiers("standard").find(tier => tier.level === 99);
  assert.equal(f.music.manager.isModifierActive(instrument, tier), false);
  const confirmation = f.controller.open(instrument, 99);
  assert.equal(confirmation.showConfirmButton, true);
  for (const [target, key, value] of [[f.music, "isUnlocked", false], [f.game.gp, "amount", masteryCosts.get(99) - 1], [f.game.bank, "quantity", 0]]) {
    const before = target[key];
    target[key] = value;
    assert.equal(confirmation.preConfirm(), false);
    assert.deepEqual(f.controller.save(), []);
    target[key] = before;
  }
  f.music.masteryLevels.set(instrument, 98);
  assert.equal(confirmation.preConfirm(), false);
  f.music.masteryLevels.set(instrument, 99);
  assert.equal(confirmation.preConfirm(), true);
  assert.equal(f.game.gp.amount, 0);
  assert.equal(f.game.bank.quantity, 0);
  assert.equal(f.refreshes(), 1);
  assert.equal(f.music.manager.isModifierActive(instrument, tier), true);
  assert.equal(f.music.manager.calculateHireCost(instrument), 4);
  assert.deepEqual(f.music.masteriesUnlocked.get(instrument), [true, true, true, true]);
  assert.equal(confirmation.preConfirm(), false);
  assert.equal(f.controller.open(instrument, 99), undefined);
  f.controller.restore(JSON.parse(JSON.stringify(f.controller.save())));
  assert.equal(f.music.manager.isModifierActive(instrument, tier), true);
  f.controller.restore(undefined);
  assert.equal(f.music.manager.isModifierActive(instrument, tier), false);
});

test("restoring purchase IDs ignores unknown, free-tier, malformed, and duplicate entries", t => {
  const f = fixture(t);
  const instrument = f.instruments[0];
  f.controller.restore([instrument.id, instrument.id, null, 7, "unknown", "mythMusic:Maraca"]);
  assert.deepEqual(f.controller.save(), [instrument.id]);
  for (const saved of [null, {}, "mythMusic:Guitar"]) {
    f.controller.restore(saved);
    assert.deepEqual(f.controller.save(), []);
  }
});

test("base-game bards receive their tiers and other mods' mastery caps are untouched", t => {
  const base = fixture(t, { enabled: false });
  assert.equal(base.music.masteryLevelCap, 99);
  assert.equal(base.instruments[0].modifiers("standard").find(tier => tier.level === 99).modifiers[0].value, 50);
  const f = fixture(t, { cap: 200, missing: ["Harp", "Tambourine"] });
  assert.equal(f.music.masteryLevelCap, 200);
  assert.equal(f.instruments.filter(instrument => instrument.modifiers("standard").some(tier => tier.level === 99)).length, 10);
});

test("all four paid tiers use their own costs and preserve Music's four saved purchase positions", t => {
  const f = fixture(t, { native: [true, false, false, false] });
  const instrument = f.instruments[0];
  f.game.gp.amount = [...masteryCosts.values()].reduce((sum, cost) => sum + cost, 0);
  f.game.bank.quantity = 4;
  for (const [level, cost] of masteryCosts) {
    f.music.masteryLevels.set(instrument, level - 1);
    assert.equal(f.controller.open(instrument, level), undefined);
    f.music.masteryLevels.set(instrument, level);
    const funds = f.game.gp.amount;
    const confirmation = f.controller.open(instrument, level);
    assert.match(confirmation.html, new RegExp(cost.toLocaleString("en-US") + " GP"));
    assert.equal(f.game.gp.amount, funds, "opening or cancelling a confirmation spends nothing");
    assert.equal(confirmation.preConfirm(), true);
    assert.equal(f.game.gp.amount, funds - cost);
    assert.equal(confirmation.preConfirm(), false, "a duplicate confirmation cannot charge twice");
  }
  assert.equal(f.game.gp.amount, 0);
  assert.equal(f.game.bank.quantity, 0);
  assert.deepEqual(f.music.masteriesUnlocked.get(instrument), [true, true, true, true]);
  assert.deepEqual(f.controller.save(), [instrument.id]);
  for (const level of [1, 75, 118, 999]) assert.equal(f.controller.open(instrument, level), undefined);
  assert.equal(f.controller.open({ ...instrument }, 99), undefined);
});

test("existing partial native purchases follow the same reward positions after remapping", t => {
  const f = fixture(t, { native: [true, false, true, false] });
  const instrument = f.instruments[0];
  assert.deepEqual(f.music.masteriesUnlocked.get(instrument), [true, false, true, false]);
  assert.deepEqual(f.music.manager.getModifiers(instrument).filter(tier => tier.level < 999).map(tier => [tier.level, tier.isActive]), [
    [1, true], [20, false], [40, true], [65, false], [99, false],
  ]);
});

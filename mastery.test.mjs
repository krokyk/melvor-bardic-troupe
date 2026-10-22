import assert from "node:assert/strict";
import test from "node:test";
import { installMastery118, mastery118Cost } from "./mastery.mjs";
import { namespace } from "./troupe.mjs";

function fixture(t, { enabled = true, cap = 99, missing = [] } = {}) {
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
  instruments.push({ id: `${namespace}:Cello`, name: "Conductor", level: 118 });
  for (const instrument of instruments) {
    const modes = Object.fromEntries(["standard", "hardcore"].map(mode => [mode, [1, 40, 75, 99, 999].map(level => ({ level }))]));
    instrument.modifiers = mode => modes[mode];
  }
  const essence = { id: "mythMusic:Essence_Of_Music" };
  const game = {
    gp: { amount: mastery118Cost, canAfford(cost) { return this.amount >= cost; }, remove(cost) { this.amount -= cost; } },
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
        level: modifier.level, isActive: this.isModifierActive(instrument, modifier),
        description: modifier.describePlain?.() ?? "Native bonus",
      }));
    }
    calculateHireCost(instrument) { return music.masteriesUnlocked.get(instrument).filter(Boolean).length; }
  }
  const music = Object.assign(new Music(), {
    level: 120, isUnlocked: true, game, manager: new Manager(), masteryLevels: new Map(),
    actions: { allObjects: instruments, getObjectByID: id => instruments.find(instrument => instrument.id === id) },
    masteriesUnlocked: new Map(instruments.map(instrument => [instrument, [true, true, true, true]])),
  });
  let refreshes = 0;
  const controller = installMastery118({
    patch(Class, name) {
      const descriptor = Object.getOwnPropertyDescriptor(Class.prototype, name);
      return {
        get(fn) { Object.defineProperty(Class.prototype, name, { configurable: true, get() { return fn.call(this, descriptor.get.bind(this)); } }); },
        replace(fn) { Class.prototype[name] = function (...args) { return fn.call(this, descriptor.value.bind(this), ...args); }; },
      };
    },
  }, music, { refresh() { refreshes++; } }, namespace);
  return { controller, music, game, instruments, swal, refreshes: () => refreshes };
}

test("Mastery 118 distributes eleven distinct preservation types in both modes and leaves four bards free", t => {
  const f = fixture(t);
  const expected = {
    Guitar: "ammoPreservationChance", Drum: "foodPreservationChance", Banjo: "runePreservationChance",
    Accordion: "consumablePreservationChance", Bouzouki: "soulPointPreservationChance", Flute: "altMagicRunePreservationChance",
    Saxophone: "unholyPrayerPointPreservationChance", Violin: "prayerPointPreservationChance", French_Horn: "summoningChargePreservationChance",
    Harp: "potionChargePreservationChance", Tambourine: "compostPreservationChance",
  };
  assert.equal(f.music.masteryLevelCap, 118);
  for (const instrument of f.instruments) {
    for (const mode of ["standard", "hardcore"]) {
      const tiers = instrument.modifiers(mode);
      assert.deepEqual(tiers.slice(0, 5).map(tier => tier.level), [1, 40, 75, 99, 999]);
      const tier = tiers.find(tier => tier.level === 118);
      const modifier = expected[instrument.name];
      if (modifier) assert.deepEqual(tier.modifiers, [{ modifier: { id: modifier }, value: 50 }]);
      else if (instrument.name === "Conductor") assert.deepEqual(tier.modifiers, [
        { modifier: { id: "flatMaxHitpoints" }, value: 10 },
        { modifier: { id: "summoningAttackInterval" }, value: -25 },
      ]);
      else assert.equal(tier, undefined);
    }
  }
  assert.deepEqual(f.instruments.filter(instrument => !instrument.modifiers("standard").some(tier => tier.level === 118)).map(instrument => instrument.name), ["Maraca", "Xylophone", "Bongo", "Trumpet"]);
});

test("purchases recheck mastery, unlocks, resources, and duplicate confirmations without changing native hiring tiers", t => {
  const f = fixture(t);
  const instrument = f.instruments[0];
  assert.equal(f.controller.open(instrument), undefined);
  f.music.masteryLevels.set(instrument, 118);
  const tier = instrument.modifiers("standard").at(-1);
  assert.equal(f.music.manager.isModifierActive(instrument, tier), false);
  const confirmation = f.controller.open(instrument);
  assert.equal(confirmation.showConfirmButton, true);
  for (const [target, key, value] of [[f.music, "isUnlocked", false], [f.game.gp, "amount", mastery118Cost - 1], [f.game.bank, "quantity", 0]]) {
    const before = target[key];
    target[key] = value;
    assert.equal(confirmation.preConfirm(), false);
    assert.deepEqual(f.controller.save(), []);
    target[key] = before;
  }
  f.music.masteryLevels.set(instrument, 117);
  assert.equal(confirmation.preConfirm(), false);
  f.music.masteryLevels.set(instrument, 118);
  assert.equal(confirmation.preConfirm(), true);
  assert.equal(f.game.gp.amount, 0);
  assert.equal(f.game.bank.quantity, 0);
  assert.equal(f.refreshes(), 1);
  assert.equal(f.music.manager.isModifierActive(instrument, tier), true);
  assert.equal(f.music.manager.calculateHireCost(instrument), 4);
  assert.deepEqual(f.music.masteriesUnlocked.get(instrument), [true, true, true, true]);
  assert.equal(confirmation.preConfirm(), false);
  assert.equal(f.controller.open(instrument), undefined);
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

test("Throne is required, absent expansion instruments are skipped, and a higher mastery cap is retained", t => {
  assert.equal(fixture(t, { enabled: false }).controller, undefined);
  const f = fixture(t, { cap: 200, missing: ["Harp", "Tambourine"] });
  assert.equal(f.music.masteryLevelCap, 200);
  assert.equal(f.instruments.filter(instrument => instrument.modifiers("standard").some(tier => tier.level === 118)).length, 10);
});

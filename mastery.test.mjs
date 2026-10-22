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
    constructor(data) { this.data = structuredClone(data); this.conditionalModifiers = structuredClone(data.conditionalModifiers); }
    describePlain() { return JSON.stringify(this.modifiers ?? this.conditionalModifiers); }
  };
  const swal = globalThis.SwalLocale = {
    fire(options) { this.options = options; return options; },
    showValidationMessage(message) { this.error = message; },
  };
  const ids = ["Guitar", "Drum", "Banjo", "Accordion", "Bouzouki", "Flute", "Maraca", "Xylophone", "Saxophone", "Violin", "Bongo", "French_Horn", "Harp", "Tambourine", "Trumpet"];
  const instruments = ids.filter(id => !missing.includes(id)).map(id => ({ id: `mythMusic:${id}`, name: id, level: 1 }));
  if (enabled) instruments.push({ id: `${namespace}:Cello`, name: "The Conductor", level: 118 });
  for (const instrument of instruments) {
    const modes = Object.fromEntries(["standard", "hardcore"].map(mode => [mode, [1, 40, 75, 99, 999].map(level => ({
      level, modifiers: [{ modifier: { id: `native:${level}` }, value: mode === "standard" ? 7 : 3 }],
    }))]));
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
      return music.masteriesUnlocked.get(instrument)[instrument.modifiers(music.settings.modifierType).indexOf(modifier)] === true;
    }
    getModifiers(instrument) {
      return instrument.modifiers(music.settings.modifierType).map(modifier => ({
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
      assert(["isModifierActive", "getModifiers"].includes(name), "mastery caps are not patched");
      const descriptor = Object.getOwnPropertyDescriptor(Class.prototype, name);
      return {
        replace(fn) { Class.prototype[name] = function (...args) { return fn.call(this, descriptor.value.bind(this), ...args); }; },
        after(fn) { Class.prototype[name] = function (...args) { const result = descriptor.value.apply(this, args); return fn.call(this, result, ...args) ?? result; }; },
      };
    },
  }, music, { refresh() { refreshes++; } }, namespace);
  return { controller, music, game, instruments, swal, refreshes: () => refreshes };
}

test("every bard has the agreed five tiers in both modes while native reward positions and values stay intact", t => {
  const f = fixture(t);
  const expected = {
    Guitar: [65, 40, 99, 20], Drum: [40, 65, 99, 20], Banjo: [20, 65, 99, 40],
    Accordion: [20, 65, 99, 40], Bouzouki: [20, 99, 40, 65], Flute: [40, 20, 99, 65],
    Maraca: [20, 40, 99, 65], Xylophone: [20, 99, 40, 65], Saxophone: [40, 99, 20, 65],
    Violin: [20, 40, 99, 65], Bongo: [40, 20, 99, 65], French_Horn: [20, 65, 99, 40],
    Harp: [20, 99, 65, 40], Tambourine: [99, 40, 65, 20], Trumpet: [20, 40, 99, 65],
    "The Conductor": [20, 40, 65, 99],
  };
  assert.equal(f.music.masteryLevelCap, 99);
  for (const instrument of f.instruments) {
    for (const mode of ["standard", "hardcore"]) {
      const tiers = instrument.modifiers(mode);
      const [first, second, third, extra] = expected[instrument.name];
      assert.deepEqual(tiers.map(tier => tier.level), [1, first, second, third, extra, 999]);
      assert.equal(tiers.at(-1).level, 999);
      for (const [index, original] of [1, 40, 75, 99].entries()) {
        assert.deepEqual(tiers[index].modifiers, [{ modifier: { id: `native:${original}` }, value: mode === "standard" ? 7 : 3 }]);
      }
      assert.deepEqual(tiers.at(-1).modifiers, [{ modifier: { id: "native:999" }, value: mode === "standard" ? 7 : 3 }]);
      f.music.settings.modifierType = mode;
      assert.deepEqual(f.music.manager.getModifiers(instrument).map(tier => tier.level), [1, 20, 40, 65, 99, 999]);
    }
  }
  assert.equal(f.instruments.filter(instrument => instrument.modifiers("standard").some(tier => tier.level === 99)).length, 16);
});

test("the ten preservation rewards, five additions, and Conductor intervals match the approved data", t => {
  const f = fixture(t);
  const expected = {
    Guitar: { ammoPreservationChance: 50 }, Drum: { foodPreservationChance: 50 }, Banjo: { runePreservationChance: 50 },
    Accordion: { consumablePreservationChance: 50 }, Bouzouki: { soulPointPreservationChance: 50 },
    Flute: { skillXP: [{ skillID: "melvorAoD:Archaeology", value: 15 }] },
    Maraca: { skillInterval: [{ skillID: "melvorD:Crafting", value: -10 }] },
    Xylophone: { masteryXP: [{ skillID: "melvorD:Agility", value: 15 }] },
    Saxophone: { unholyPrayerPointPreservationChance: 50 }, Violin: { prayerPointPreservationChance: 50 },
    French_Horn: { summoningChargePreservationChance: 50 }, Harp: { potionChargePreservationChance: 50 },
    Tambourine: { compostPreservationChance: 50 }, Trumpet: { critChance: 5 },
    "The Conductor": { summoningAttackInterval: -25, attackInterval: -10 },
  };
  for (const instrument of f.instruments) {
    for (const mode of ["standard", "hardcore"]) {
      const extra = instrument.modifiers(mode)[4];
      if (instrument.name === "Bongo") {
        assert.deepEqual(extra.data.conditionalModifiers, [{
          condition: { type: "FightingSlayerTask" },
          modifiers: { flatResistance: [{ damageTypeID: "melvorD:Normal", value: 3 }] },
          description: "+3% Damage Reduction while fighting your Slayer Task.",
        }]);
      } else assert.deepEqual(extra.data.modifiers, expected[instrument.name]);
      assert.equal(extra.data.modifiers?.altMagicRunePreservationChance, undefined);
    }
  }
});

test("purchases recheck mastery, unlocks, resources, and duplicate confirmations without changing native hiring tiers", t => {
  const f = fixture(t);
  const instrument = f.instruments.find(instrument => instrument.id === `${namespace}:Cello`);
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

test("restoring extra purchases at any tier retains legacy IDs and ignores malformed or duplicate entries", t => {
  const f = fixture(t);
  const instrument = f.instruments.find(instrument => instrument.id === `${namespace}:Cello`);
  f.controller.restore([instrument.id, instrument.id, null, 7, "unknown", "mythMusic:Guitar", "mythMusic:Flute", "mythMusic:Tambourine"]);
  assert.deepEqual(f.controller.save(), [instrument.id, "mythMusic:Guitar", "mythMusic:Flute", "mythMusic:Tambourine"]);
  for (const saved of [null, {}, "mythMusic:Guitar"]) {
    f.controller.restore(saved);
    assert.deepEqual(f.controller.save(), []);
  }
});

test("base-game bards receive their tiers and other mods' mastery caps are untouched", t => {
  const base = fixture(t, { enabled: false });
  assert.equal(base.music.masteryLevelCap, 99);
  assert.equal(base.instruments[0].modifiers("standard").find(tier => tier.level === 20).modifiers.find(value => value.modifier.id === "ammoPreservationChance").value, 50);
  const f = fixture(t, { cap: 200, missing: ["Harp", "Tambourine"] });
  assert.equal(f.music.masteryLevelCap, 200);
  assert.equal(f.instruments.filter(instrument => instrument.modifiers("standard").some(tier => tier.level === 99)).length, f.instruments.length);
});

test("all four paid tiers use their own costs and preserve Music's four saved purchase positions", t => {
  const f = fixture(t, { native: [true, false, false, false] });
  const instrument = f.instruments.find(instrument => instrument.id === `${namespace}:Cello`);
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
  assert.equal(f.controller.open(instrument, 99), undefined);
});

test("a lower extra purchase and a native Mastery 99 purchase use separate storage without shifting native indices", t => {
  const f = fixture(t, { native: [true, false, false, false] });
  const guitar = f.instruments[0];
  f.music.masteryLevels.set(guitar, 99);
  f.game.gp.amount = masteryCosts.get(20) + masteryCosts.get(99);
  f.game.bank.quantity = 2;
  assert.equal(f.controller.open(guitar, 20).preConfirm(), true);
  assert.deepEqual(f.controller.save(), [guitar.id]);
  assert.deepEqual(f.music.masteriesUnlocked.get(guitar), [true, false, false, false]);
  assert.equal(f.controller.open(guitar, 99).preConfirm(), true);
  assert.deepEqual(f.music.masteriesUnlocked.get(guitar), [true, false, false, true]);
  assert.deepEqual(f.controller.save(), [guitar.id]);
  f.controller.restore(undefined);
  assert.equal(f.music.manager.getModifiers(guitar).find(tier => tier.level === 20).isActive, false);
  assert.equal(f.music.manager.getModifiers(guitar).find(tier => tier.level === 99).isActive, true);
  f.controller.restore([guitar.id]);
  assert.equal(f.music.manager.getModifiers(guitar).find(tier => tier.level === 20).isActive, true);
  assert.equal(f.game.gp.amount, 0);
});

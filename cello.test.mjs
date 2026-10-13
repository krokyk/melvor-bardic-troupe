import assert from "node:assert/strict";
import test from "node:test";
import { installCello } from "./cello.mjs";
import { createShopData, namespace, Troupe } from "./troupe.mjs";

async function fixture(t, { enabled = true } = {}) {
  const globals = ["cloudManager", "loadedLangJson", "getLangString", "notifyPlayer"];
  const previous = new Map(globals.map(key => [key, globalThis[key]]));
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  globalThis.cloudManager = { hasTotHEntitlementAndIsEnabled: enabled };
  globalThis.loadedLangJson = {};
  globalThis.getLangString = key => key;
  const notices = [];
  globalThis.notifyPlayer = (_skill, message) => notices.push(message);
  const prayer = (id, properties = {}) => ({ id, isUnholy: false, isAbyssal: false, ...properties });
  const prayers = [1, 2, 3, 4].map(id => prayer(`prayer:${id}`));
  prayers.push(prayer("prayer:unholy", { isUnholy: true }), prayer("prayer:abyssal", { isAbyssal: true }));
  class Player {
    get activePrayers() { return this.equipmentSets[this.selectedEquipmentSet].prayerSelection; }
    canEnablePrayer(prayer) { this.checked = prayer; return !prayer.blocked; }
    togglePrayer(prayer, render = true) {
      this.nativeCalls++;
      if (this.activePrayers.has(prayer)) this.activePrayers.delete(prayer);
      else if (this.activePrayers.size < 2 && this.canEnablePrayer(prayer)) this.activePrayers.add(prayer);
      if (render) this.render();
    }
    render() { this.renders++; }
    encode(writer = {}) {
      writer.prayers = this.equipmentSets.map(set => [...set.prayerSelection].map(prayer => prayer.id));
      if (writer.fail) throw new Error("encode failed");
      return writer;
    }
  }
  const player = Object.assign(new Player(), {
    selectedEquipmentSet: 0, equipmentSets: [{ prayerSelection: new Set(prayers.slice(0, 2)) }],
    renderQueue: {}, nativeCalls: 0, renders: 0,
    manager: { computations: 0, computeAllStats() { this.computations++; } },
  });
  class BaseMusic {
    getMaxTotalMasteryLevels(ns) { return ns === namespace ? 99 : 15 * 99; }
    getTotalCurrentMasteryLevels(ns) { return ns === namespace ? 40 : 15; }
  }
  class Music extends BaseMusic {
    getMaxTotalMasteryLevels() { return super.getMaxTotalMasteryLevels("mythMusic"); }
    getTotalCurrentMasteryLevels() { return super.getTotalCurrentMasteryLevels("mythMusic"); }
    computeProvidedStats() {}
  }
  const instruments = Array.from({ length: 15 }, (_, index) => ({ id: `mythMusic:Instrument_${index}` }));
  const bards = new Map();
  const game = { combat: { player }, renderQueue: {}, prayer: {}, prayers: { getObjectByID: id => prayers.find(prayer => prayer.id === id) } };
  const music = Object.assign(new Music(), {
    id: "mythMusic:Music", level: 118, game, bards: { get: instrument => bards.get(instrument) },
    actions: { allObjects: instruments, getObjectByID: id => instruments.find(instrument => instrument.id === id) },
  });
  const packages = [];
  const ctx = {
    gameData: { async addPackage(data) {
      packages.push(data);
      instruments.push(...data.data.skillData[0].data.instruments.map(instrument => ({ ...instrument, id: `${namespace}:${instrument.id}` })));
    } },
    patch(Class, name) {
      const original = Class.prototype[name];
      return {
        after(fn) { Class.prototype[name] = function (...args) { const result = original.apply(this, args); return fn.call(this, result, ...args) ?? result; }; },
        replace(fn) { Class.prototype[name] = function (...args) { return fn.call(this, original.bind(this), ...args); }; },
      };
    },
  };
  let ready = true;
  const cello = await installCello(ctx, music, () => ready, namespace);
  const instrument = music.actions.getObjectByID(`${namespace}:Cello`);
  const bard = { instrument, isUpgraded: true };
  if (instrument) bards.set(instrument, bard);
  return { cello, music, player, prayers, packages, bards, bard, instrument, notices, ready(value) { ready = value; } };
}

test("Cello registers before capacity calculation with all combat tiers and both modifier settings", async t => {
  const f = await fixture(t);
  assert.equal(f.instrument.level, 118);
  assert.equal(f.instrument.baseInterval, 3000);
  assert.equal(f.instrument.baseExperience, 547);
  assert.deepEqual(f.instrument.standardModifiers.map(bonus => bonus.level), [1, 40, 75, 99, 999]);
  assert.deepEqual(f.instrument.hardcoreModifiers, f.instrument.standardModifiers);
  const { skillItemDoublingChance, skillPreservationChance, ...combat } = f.instrument.standardModifiers[1].modifiers;
  assert.deepEqual(combat, { critChance: 20, critMultiplier: 100, lifesteal: 10 });
  assert.equal(f.instrument.standardModifiers[0].modifiers.flatPrayerPointCost, -3);
  assert.equal(f.music.getMaxTotalMasteryLevels(), 16 * 99);
  assert.equal(f.music.getTotalCurrentMasteryLevels(), 55);
  const purchases = createShopData(f.music).data.shopPurchases;
  assert.equal(purchases.length, 15);
  assert.equal(purchases.at(-1).customName, "Bardic Troupe XV");
  f.music.manager = {};
  f.music.game.shop = { getPurchaseCount: () => 1 };
  const troupe = new Troupe(f.music, purchases);
  assert.equal(troupe.slots().length, 16);
  assert.equal(troupe.canBuySlot(), false);
  assert.equal(loadedLangJson.Myth_Music_Instrument_Cello, "Cello");
});

test("all five Cello tiers add 10 points of skill doubling and preservation under both modifier settings", async t => {
  const f = await fixture(t);
  const modification = f.packages[0].modifications.modifiers[0];
  assert.equal(modification.id, "melvorD:skillItemDoublingChance");
  assert.deepEqual(modification.allowedScopes[0].scopes, {});
  for (const bonuses of [f.instrument.standardModifiers, f.instrument.hardcoreModifiers]) {
    let preservation = 0;
    let doubling = 0;
    for (const [index, { modifiers }] of bonuses.entries()) {
      assert.equal(modifiers.skillPreservationChance, 10);
      assert.equal(modifiers.skillItemDoublingChance, 10);
      assert.equal(modifiers.globalItemDoublingChance, undefined, "skill bonuses must not increase combat loot doubling");
      preservation += modifiers.skillPreservationChance;
      doubling += modifiers.skillItemDoublingChance;
      assert.equal(preservation, (index + 1) * 10);
      assert.equal(doubling, (index + 1) * 10);
    }
  }
});

test("without Throne of the Herald no Cello, additional slot, or prayer patch is registered", async t => {
  const f = await fixture(t, { enabled: false });
  assert.equal(f.cello, undefined);
  assert.equal(f.packages.length, 0);
  assert.equal(createShopData(f.music).data.shopPurchases.length, 14);
  f.player.togglePrayer(f.prayers[2]);
  assert.equal(f.player.activePrayers.size, 2);
  assert.equal(f.player.nativeCalls, 1);
});

test("third prayer requires an upgraded hired Cello at level 118 and never enables a fourth", async t => {
  const f = await fixture(t);
  f.bard.isUpgraded = false;
  f.player.togglePrayer(f.prayers[2]);
  assert.equal(f.player.activePrayers.size, 2);
  f.bard.isUpgraded = true;
  f.music.level = 117;
  f.player.togglePrayer(f.prayers[2]);
  assert.equal(f.player.activePrayers.size, 2);
  f.music.level = 118;
  f.bards.clear();
  f.player.togglePrayer(f.prayers[2]);
  assert.equal(f.player.activePrayers.size, 2);
  f.bards.set(f.instrument, f.bard);
  f.player.togglePrayer(f.prayers[2], false);
  assert.equal(f.player.activePrayers.size, 3);
  assert.equal(f.player.checked, f.prayers[2]);
  assert.equal(f.player.manager.computations, 1);
  assert.equal(f.player.renderQueue.prayerSelection, true);
  assert.equal(f.music.game.renderQueue.activeSkills, true);
  f.player.togglePrayer(f.prayers[3]);
  assert.equal(f.player.activePrayers.size, 3);
  assert.equal(f.notices.at(-1), "You cannot activate more than 3 Prayers at once.");
  f.player.togglePrayer(f.prayers[2]);
  assert.equal(f.player.activePrayers.size, 2);
});

test("the third prayer retains book restrictions and native resource and equipment validation", async t => {
  const f = await fixture(t);
  for (const prayer of f.prayers.slice(4)) f.player.togglePrayer(prayer);
  assert.deepEqual(f.notices, ["INVALID_PRAYER_BOOK_SELECTED", "INVALID_PRAYER_BOOK_SELECTED"]);
  f.prayers[2].blocked = true;
  f.player.togglePrayer(f.prayers[2]);
  assert.equal(f.player.activePrayers.size, 2);
  assert.equal(f.player.checked, f.prayers[2]);
  assert.equal(f.player.manager.computations, 0);
  for (const isAbyssal of [false, true]) {
    const book = f.prayers.slice(0, 4).map(prayer => ({ ...prayer, isAbyssal, isUnholy: !isAbyssal, blocked: false }));
    f.player.equipmentSets[0].prayerSelection = new Set(book.slice(0, 2));
    f.player.togglePrayer(book[2]);
    assert.equal(f.player.activePrayers.size, 3);
    f.player.togglePrayer(book[3]);
    assert.equal(f.player.activePrayers.size, 3);
  }
});

test("native saves contain two prayers per equipment set while addon state restores the third", async t => {
  const f = await fixture(t);
  f.player.togglePrayer(f.prayers[2]);
  f.player.equipmentSets.push({ prayerSelection: new Set([f.prayers[0], f.prayers[1], f.prayers[3]]) });
  const sets = f.player.equipmentSets.map(set => set.prayerSelection);
  const extra = JSON.parse(JSON.stringify(f.cello.savePrayers()));
  const saved = f.player.encode();
  assert.deepEqual(saved.prayers, [["prayer:1", "prayer:2"], ["prayer:1", "prayer:2"]]);
  assert.deepEqual(extra, ["prayer:3", "prayer:4"]);
  assert(f.player.equipmentSets.every((set, index) => set.prayerSelection === sets[index] && set.prayerSelection.size === 3));
  assert.throws(() => f.player.encode({ fail: true }), /encode failed/);
  assert(f.player.equipmentSets.every((set, index) => set.prayerSelection === sets[index]));
  f.player.equipmentSets.forEach((set, index) => { set.prayerSelection = new Set(saved.prayers[index].map(id => f.prayers.find(prayer => prayer.id === id))); });
  f.cello.restorePrayers(extra);
  assert.deepEqual(f.player.equipmentSets.map(set => [...set.prayerSelection].map(prayer => prayer.id)), [
    ["prayer:1", "prayer:2", "prayer:3"], ["prayer:1", "prayer:2", "prayer:4"],
  ]);
  f.cello.restorePrayers(extra);
  assert(f.player.equipmentSets.every(set => set.prayerSelection.size === 3));
});

test("losing the upgrade trims every equipment set after character restoration is ready", async t => {
  const f = await fixture(t);
  f.player.togglePrayer(f.prayers[2]);
  f.player.equipmentSets.push({ prayerSelection: new Set(f.prayers.slice(0, 3)) });
  f.ready(false);
  f.bard.isUpgraded = false;
  f.music.computeProvidedStats();
  assert(f.player.equipmentSets.every(set => set.prayerSelection.size === 3));
  f.ready(true);
  f.music.computeProvidedStats();
  assert(f.player.equipmentSets.every(set => set.prayerSelection.size === 2));
  f.cello.restorePrayers(["prayer:3", "prayer:3"]);
  assert.equal(f.player.activePrayers.size, 2);
});

test("restoring ignores unsupported, unknown, duplicate, mixed-book, and unaffordable prayers", async t => {
  const f = await fixture(t);
  for (const saved of [null, {}, "prayer:3", [null], ["missing"], ["prayer:1"], ["prayer:unholy"], ["prayer:abyssal"]]) {
    f.cello.restorePrayers(saved);
    assert.equal(f.player.activePrayers.size, 2);
  }
  f.prayers[2].blocked = true;
  f.cello.restorePrayers(["prayer:3"]);
  assert.equal(f.player.activePrayers.size, 2);
  f.prayers[2].blocked = false;
  f.cello.restorePrayers(["prayer:3"]);
  assert.equal(f.player.activePrayers.size, 3);
  f.music.level = 117;
  f.music.computeProvidedStats();
  assert.equal(f.player.activePrayers.size, 2);
});

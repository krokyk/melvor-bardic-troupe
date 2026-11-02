import assert from "node:assert/strict";
import test from "node:test";
import { installAbyssalEquipment } from "./abyssal-equipment.mjs";
import { abyssalEquipment, createAbyssalEquipmentData } from "./abyssal-equipment-data.mjs";

const namespace = "KrokyBardicTroupe";
class Node {
  constructor(tag) { this.tag = tag; }
}

async function fixture(t, { enabled = true } = {}) {
  const previous = new Map(["document", "SwalLocale", "StatObject", "rollPercentage", "ui"].map(key => [key, globalThis[key]]));
  t.after(() => { for (const [key, value] of previous) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  globalThis.document = { createElement: tag => new Node(tag) };
  globalThis.StatObject = class { constructor(data) { this.data = data; } };
  const swal = globalThis.SwalLocale = {
    fire(options) { this.options = options; options.didOpen?.(); return options; },
    clickConfirm() { this.closed = true; }, showValidationMessage(message) { this.error = message; },
    resetValidationMessage() { this.error = undefined; },
  };
  let component, mountedHost;
  globalThis.ui = { create(props, host) { component = props; mountedHost = host; } };
  const percentages = [];
  globalThis.rollPercentage = chance => { percentages.push(chance); return true; };
  const normal = { id: "melvorD:Melvor", isUnlocked: true }, abyssal = { id: "melvorItA:Abyssal", isUnlocked: true };
  const instruments = [
    { id: "mythMusic:Guitar", name: "Guitar", realm: normal },
    { id: `${namespace}:Abyssal_Guitar`, name: "Abyssal Guitar", realm: abyssal, abyssalLevel: 1 },
    { id: `${namespace}:Abyssal_Harp`, name: "Abyssal Harp", realm: abyssal, abyssalLevel: 48 },
  ];
  const bards = new Map([[1, { instrument: instruments[0], slot: 1 }], [1001, { instrument: instruments[1], slot: 1001 }], [1002, { instrument: instruments[2], slot: 1002 }]]);
  const items = new Map(), quantities = new Map(), consumed = [], calls = [], nativeStats = [];
  const game = { abyssalPieces: {}, registeredNamespaces: { hasNamespace: id => enabled && id === abyssal.id.split(":")[0] },
    realms: { getObjectByID: id => id === abyssal.id ? abyssal : undefined },
    items: { getObjectByID: id => items.get(id) },
    getModifierValuesFromData(data) { return Object.entries(data).flatMap(([id, values]) => values.map(value => ({ id, ...value }))); },
    bank: { getQty: item => quantities.get(item) ?? 0, removeItemQuantityByID(id, amount, update) {
      const item = items.get(id); assert(this.getQty(item) >= amount); quantities.set(item, this.getQty(item) - amount); consumed.push({ id, amount, update });
    } },
    summoning: { rollMarksForSkill(...args) { calls.push(["marks", ...args]); } },
  };
  class Music {
    addProvidedStats() { nativeStats.push("native"); }
    computeProvidedStats() { this.providedStats.values.length = 0; this.addProvidedStats(); this.computations++; }
    isMasteryActionUnlocked(instrument) { return !instrument.locked; }
    get actionRewards() {
      if (this.fail) throw new Error("native reward failure");
      this.nativeRewards++;
      const rewards = { xp: 10, axp: 600, ap: 100, mastery: 25, events: 1, items: [],
        addItemByID(id, qty) { this.items.push([id, qty]); } };
      return rewards;
    }
    rollForRareDrops(...args) { calls.push(["rare", ...args]); }
    rollForMasteryTokens(...args) { calls.push(["tokens", ...args]); }
    rollForAncientRelics(...args) { calls.push(["relics", ...args]); }
    rollForPets(...args) { calls.push(["pets", ...args]); }
  }
  const music = Object.assign(new Music(), { game, isUnlocked: true, currentRealm: normal, activeInstrument: instruments[1],
    currentActionInterval: 3000, masteryModifiedInterval: 2500, renderQueue: {}, nativeRewards: 0, computations: 0,
    actions: { getObjectByID: id => instruments.find(instrument => instrument.id === id) },
    bards: { get: slot => bards.get(slot), all: () => [...bards.values()], set(instrument, bard) { assert.equal(instrument, bard.instrument); bards.set(bard.slot, bard); } },
    manager: { getModifiers: () => [{ isUpgrade: true, description: "Upgrade reward <safe text>" }] },
    providedStats: { values: [], addStatObject(source, stats) { this.values.push({ source, stats }); } },
    userInterface: { instruments: new Map([[instruments[1], { updates: 0, updateDisabled() { this.updates++; } }]]) },
  });
  const packages = [], patched = [];
  const ctx = { async loadModule(path) { assert.equal(path, "abyssal-equipment-data.mjs"); return { abyssalEquipment, createAbyssalEquipmentData }; },
    gameData: { async addPackage(data) {
      packages.push(data);
      for (const definition of data.data.items) {
        const item = { ...definition, id: `${namespace}:${definition.id}`, localID: definition.id };
        items.set(item.id, item); quantities.set(item, 2);
      }
    } }, patch(Class, name) {
      patched.push(name);
      const descriptor = Object.getOwnPropertyDescriptor(Class.prototype, name);
      return { after(callback) { Class.prototype[name] = function (...args) { const result = descriptor.value.apply(this, args); return callback.call(this, result, ...args) ?? result; }; },
        get(callback) { Object.defineProperty(Class.prototype, name, { configurable: true, get() { return callback.call(this, descriptor.get.bind(this)); } }); },
      };
    },
  };
  const controller = await installAbyssalEquipment(ctx, music, namespace);
  const item = localID => items.get(`${namespace}:${localID}`);
  return { controller, music, game, instruments, bards, items, quantities, item, consumed, swal, calls, percentages, nativeStats, packages, patched,
    component: () => component, host: () => mountedHost, normal, abyssal };
}

test("enhancements are registered only with Into the Abyss and preserve normal attachments when restoring", async t => {
  const absent = await fixture(t, { enabled: false });
  assert.equal(absent.controller, undefined); assert.equal(absent.packages.length, 0); assert.equal(absent.patched.length, 0);
  const f = await fixture(t);
  assert.equal(f.packages[0].data.items.length, 7);
  for (const definition of abyssalEquipment.filter(entry => entry.state !== "upgrade")) {
    const legacy = { id: `mythMusic:${definition.type}` };
    assert.equal(f.controller.restoreItem(f.instruments[0], legacy, definition.state), legacy);
    assert.equal(f.controller.restoreItem(f.instruments[1], legacy, definition.state), f.item(definition.id));
    assert.equal(f.controller.restoreItem(f.instruments[1], f.item(definition.id), definition.state), f.item(definition.id));
    assert.equal(f.controller.restoreItem(f.instruments[1], legacy, definition.state === "socket" ? "utility" : "socket"), undefined);
  }
  assert.equal(f.controller.restoreItem(f.instruments[1], { id: "unknown:Item" }, "socket"), undefined);
});

test("only eligible Abyssal bard equipment applies scoped stats, with each stat object parsed before use", async t => {
  const f = await fixture(t);
  f.bards.get(1001).socket = f.item("Polished_Nightopal_Gem");
  f.bards.get(1001).utility = f.item("Pristine_Abyssal_Leather");
  f.bards.get(1002).socket = f.item("Polished_Shadowpearl_Gem");
  f.bards.get(1).socket = f.item("Polished_Moonstone_Gem");
  f.music.addProvidedStats();
  assert.equal(f.nativeStats.length, 1);
  const applied = f.music.providedStats.values;
  assert.equal(applied.length, 3);
  assert(applied.every(value => value.source.realm === f.abyssal));
  assert.deepEqual(applied[0].stats.modifiers, [{ id: "currencyGain", currencyID: "melvorItA:AbyssalPieces", skillID: "mythMusic:Music", value: 5 }]);
  assert.deepEqual(applied[1].stats.modifiers, [{ id: "skillInterval", skillID: "mythMusic:Music", realmID: f.abyssal.id, value: -5 }]);
  assert.equal(applied[2].stats.modifiers[0].id, "abyssalSkillXP");
  f.instruments[2].locked = true;
  f.music.computeProvidedStats(); assert.equal(applied.length, 2);
  f.abyssal.isUnlocked = false;
  f.music.computeProvidedStats(); assert.equal(applied.length, 0);
});

test("Abyssal Upgrade, Socket and Utility reuse Music's native template and return to its Manage view", async t => {
  const f = await fixture(t), bard = f.bards.get(1001);
  f.controller.open(1, "upgrade"); assert.equal(f.swal.options, undefined, "normal bards retain the native menu");
  f.controller.open(1001, "socket");
  const socket = f.component();
  assert.equal(socket.$template, "#myth-music-equipment");
  assert.equal(socket.state, "socket");
  assert.equal(f.host(), f.swal.options.html);
  assert.equal(f.host().id, "myth-music-equipment-container");
  assert.equal(f.swal.options.titleText, undefined, "the native header belongs inside the shared template");
  assert.equal(f.swal.options.showConfirmButton, false);
  assert.equal(f.swal.options.showCancelButton, false, "Back belongs inside the native content, not the Swal footer");
  assert.equal(f.swal.options.showDenyButton, false);
  for (const definition of abyssalEquipment) assert.equal(socket.items[definition.type].item, f.item(definition.id));
  socket.socket("Polished_Topaz_Gem");
  assert.equal(bard.socket, f.item("Polished_Nightopal_Gem"));
  assert.deepEqual(f.consumed, [{ id: bard.socket.id, amount: 1, update: true }]);
  assert.equal(f.music.computations, 1);
  assert.equal(f.music.renderQueue.bardModifiers, true);
  assert.equal(socket.state, "manage");
  assert.equal(f.swal.closed, undefined, "applying an item retains Music's native Manage view");
  assert.equal(socket.isSocket("Polished_Topaz_Gem"), true);
  assert.deepEqual(socket.getModifier(bard.socket.localID), [abyssalEquipment[1].description]);
  socket.socket("Polished_Topaz_Gem"); assert.equal(f.consumed.length, 1, "duplicate handlers cannot charge again");
  let refreshed = 0;
  f.controller.open(1001, "utility", () => refreshed++);
  const utility = f.component();
  assert.equal(utility.$template, socket.$template);
  assert.equal(utility.state, "utility");
  utility.utility("Pristine_Leather");
  assert.equal(bard.utility, f.item("Pristine_Abyssal_Leather")); assert.equal(refreshed, 1);
  assert.equal(utility.state, "manage");
  assert.equal(utility.isUtility("Pristine_Leather"), true);
  utility.setState("utility");
  assert.equal(utility.items.Pristine_Leather.quantity, 1, "reopening a native panel refreshes bank counts");
  utility.setState("manage");
  assert.equal(f.consumed.length, 2, "Back only changes the native view");
  f.controller.open(1001, "upgrade");
  const upgrade = f.component();
  assert.equal(upgrade.$template, socket.$template);
  assert.equal(upgrade.state, "upgrade");
  assert.equal(upgrade.upgradeModifier.description, "Upgrade reward <safe text>");
  upgrade.upgrade();
  assert.equal(bard.isUpgraded, true);
  assert.equal(f.consumed.at(-1).id, f.item("Abyssal_Essence_Of_Music").id);
  assert.equal(upgrade.state, "manage");
  upgrade.ok();
  assert.equal(f.swal.closed, true);
});

test("native Back and a successful retry clear a failed enhancement's validation message", async t => {
  const f = await fixture(t), item = f.item("Polished_Nightopal_Gem");
  f.controller.open(1001, "socket");
  const component = f.component();
  f.quantities.set(item, 0);
  assert.equal(component.socket("Polished_Topaz_Gem"), false);
  assert.match(f.swal.error, /Could not apply/);
  component.setState("manage");
  assert.equal(f.swal.error, undefined);
  assert.equal(f.consumed.length, 0, "Back spends nothing after a failed application");
  component.setState("socket");
  assert.equal(component.socket("Polished_Topaz_Gem"), false);
  assert.match(f.swal.error, /Could not apply/);
  f.quantities.set(item, 1);
  assert.equal(component.socket("Polished_Topaz_Gem"), true);
  assert.equal(component.state, "manage");
  assert.equal(f.swal.error, undefined);
  assert.equal(f.consumed.length, 1);
});

test("pending enhancement choices recheck inventory, unlocks, registry identity and replaced bards before spending", async t => {
  for (const change of [
    f => f.quantities.set(f.item("Polished_Nightopal_Gem"), 0),
    f => { f.instruments[1].locked = true; },
    f => { f.abyssal.isUnlocked = false; },
    f => { f.music.isUnlocked = false; },
    f => f.bards.set(1001, { ...f.bards.get(1001) }),
    f => f.items.delete(f.item("Polished_Nightopal_Gem").id),
  ]) {
    const f = await fixture(t);
    f.controller.open(1001, "socket"); const component = f.component(); change(f); component.socket("Polished_Topaz_Gem");
    assert.equal(f.consumed.length, 0); assert.equal(f.music.computations, 0); assert.equal(f.swal.closed, undefined);
    assert.match(f.swal.error, /Could not apply/);
    assert.equal(component.state, "socket");
  }
});

test("String and Oil use utility attachments and repeat only their intended rewards for actual Abyssal actions", async t => {
  const f = await fixture(t), string = f.item("Abyssal_String"), oil = f.item("Abyssal_Oil");
  f.bards.get(1001).utility = string;
  f.bards.get(1002).utility = oil;
  f.bards.get(1).utility = oil;
  const rewards = f.music.actionRewards;
  assert.deepEqual(rewards.items, [["mythMusic:Sheet_Music", 1]]);
  assert.deepEqual(f.percentages, [5]);
  assert.equal(f.music.nativeRewards, 1);
  assert.deepEqual([rewards.xp, rewards.axp, rewards.ap, rewards.mastery, rewards.events], [10, 600, 100, 25, 1]);
  assert.deepEqual(f.calls.map(call => call[0]), ["rare", "tokens", "relics", "pets", "marks"]);
  assert.deepEqual(f.calls[0], ["rare", 1, rewards, f.instruments[1]]);
  assert.deepEqual(f.calls[1], ["tokens", rewards, f.abyssal]);
  assert.deepEqual(f.calls[2], ["relics", 1, f.abyssal]);
  assert.deepEqual(f.calls[3], ["pets", 3000, f.instruments[1]]);
  assert.deepEqual(f.calls[4], ["marks", f.music, 2500, f.abyssal]);
  f.music.activeInstrument = f.instruments[0]; f.music.currentRealm = f.abyssal;
  assert.deepEqual(f.music.actionRewards.items, []);
  assert.equal(f.calls.length, 5, "viewing the Abyssal realm cannot affect ordinary training");
  f.music.activeInstrument = f.instruments[1]; f.instruments[2].locked = true;
  f.music.actionRewards; assert.equal(f.calls.length, 5, "locked hired bards cannot add Oil rolls");
  f.music.fail = true; assert.throws(() => f.music.actionRewards, /native reward failure/);
});

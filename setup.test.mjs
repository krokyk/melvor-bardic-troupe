import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { setup } from "./setup.mjs";
import * as core from "./troupe.mjs";
import * as config from "./config.mjs";
import * as conductor from "./conductor.mjs";
import * as mastery from "./mastery.mjs";
import * as bonuses from "./bonuses.mjs";

test("setup loads through Melvor's standalone module URLs", async () => {
  let registered = false;
  await setup({
    async loadModule(path) {
      const source = await readFile(new URL(path, import.meta.url));
      return import(`data:text/javascript;base64,${source.toString("base64")}`);
    },
    onModsLoaded() { registered = true; },
  });
  assert.equal(registered, true);
});

async function fixture(t, { instrumentCount = 4, missingMusic = false, celloEnabled = false } = {}) {
  const globals = ["game", "Shop", "ShopTabMenu", "ShopCostsAndUnlock", "shopMenu", "cloudManager", "loadedLangJson", "notifyPlayer", "getLangString", "StatObject"];
  const previous = new Map(globals.map(key => [key, globalThis[key]]));
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const storage = new Map();
  const hooks = {};
  const sections = new Map();
  let unlocked = false;
  let troupe;
  const instruments = Array.from({ length: instrumentCount }, (_, index) => {
    const modes = Object.fromEntries(["standard", "hardcore"].map(mode => [mode, [1, 40, 75, 99, 999].map(level => ({ level }))]));
    return { id: `mythMusic:Instrument_${index}`, level: 1, modifiers: mode => modes[mode] };
  });
  const counts = new Map();
  const band = { id: "mythMusic:Band_Practice" };
  const unrelated = { id: "melvorD:Other" };
  const registry = new Map([[band.id, band], [unrelated.id, unrelated]]);
  class Shop {
    constructor() {
      this.purchases = { getObjectByID: id => registry.get(id) };
      this.purchaseDisplayOrder = [unrelated, band];
      this.renderQueue = {};
      this.events = new Map();
      this.nativeBuys = 0;
    }
    getPurchaseCount(purchase) { return counts.get(purchase) ?? 0; }
    on(name, handler) { this.events.set(name, handler); }
    buyItemOnClick(purchase) {
      this.nativeBuys++;
      if (this.getPurchaseCount(purchase) >= (purchase.defaultBuyLimit ?? 1)) return;
      if (!purchase.purchaseRequirements?.every(req => req.type === "SkillLevel" ? req.skill.isUnlocked && req.skill.level >= req.level :
        req.type !== "ShopPurchase" || this.getPurchaseCount(registry.get(req.purchaseID)) >= req.count)) return;
      const price = purchase.costs?.currencies[0].cost ?? 0;
      if (!game.gp.canAfford(price)) return;
      game.gp.remove(price);
      if (purchase.contains?.modifiers !== undefined) counts.set(purchase, this.getPurchaseCount(purchase) + 1);
      this.events.get("purchaseMade")?.({ purchase, quantity: 1 });
    }
  }
  class ShopTabMenu { shouldShowItem() { return 1; } }
  class ShopCostsAndUnlock { updatePurchaseRequirements() {} }
  class Music {
    get masteryLevelCap() { return 99; }
    unlockMastery() {}
    computeProvidedStats() { this.computations = (this.computations ?? 0) + 1; }
    encode(writer) { writer.bards = this.bards.all().map(bard => ({ ...bard })); return writer; }
    decode(writer) {
      this.bards.clear();
      for (const bard of writer.bards ?? []) this.bards.set(bard.instrument, { ...bard });
    }
  }
  class Manager {
    isModifierActive(_instrument, modifier) { return modifier.level === 1; }
    getModifiers(instrument) {
      return instrument.modifiers("standard").map(tier => ({ level: tier.level, isActive: this.isModifierActive(instrument, tier) }));
    }
    get isBandPracticeUnlocked() { return game.shop.getPurchaseCount(band) > 0; }
  }
  const bards = {
    bards: new Map(),
    all() { return [...this.bards.values()]; },
    get(key) { return typeof key === "number" ? this.all().find(bard => bard.slot === key) : this.bards.get(key); },
    set(key, value) { this.bards.set(key, value); },
    remove(key) { this.bards.delete(key); },
    isHired(key) { return this.bards.has(key); },
    clear() { this.bards.clear(); },
  };
  class Player {
    get activePrayers() { return this.equipmentSets[this.selectedEquipmentSet].prayerSelection; }
    canEnablePrayer() { return true; }
    togglePrayer(prayer) {
      if (this.activePrayers.has(prayer)) this.activePrayers.delete(prayer);
      else if (this.activePrayers.size < 2) this.activePrayers.add(prayer);
    }
    render() {}
    encode(writer) { writer.prayers = this.equipmentSets.map(set => [...set.prayerSelection].map(prayer => prayer.id)); }
  }
  const prayers = [1, 2, 3, 4].map(id => ({ id: `prayer:${id}`, isUnholy: false, isAbyssal: false }));
  const player = Object.assign(new Player(), {
    selectedEquipmentSet: 0, equipmentSets: [{ prayerSelection: new Set() }], renderQueue: {},
    manager: { computeAllStats() {} },
  });
  class Game {
    encode(writer = {}) {
      player.encode(writer);
      this.music.encode(writer);
      writer.counts = [...counts];
      writer.troupe = structuredClone(storage.get("troupe"));
      writer.settings = Object.fromEntries([...sections.values()].flatMap(section => [...section.fields].map(([name, field]) => [name, field.value])));
      return writer;
    }
    decode(writer) {
      player.equipmentSets = (writer.prayers ?? [[]]).map(ids => ({ prayerSelection: new Set(ids.map(id => prayers.find(prayer => prayer.id === id))) }));
      counts.clear();
      for (const [purchase, count] of writer.counts ?? []) counts.set(purchase, count);
      this.music.decode(writer);
      // Melvor leaves missing mod storage untouched instead of clearing it.
      if (writer.troupe !== undefined) storage.set("troupe", structuredClone(writer.troupe));
      for (const section of sections.values()) {
        for (const [name, field] of section.fields) {
          if (Object.hasOwn(writer.settings ?? {}, name)) field.value = writer.settings[name];
        }
      }
    }
  }
  globalThis.Shop = Shop;
  globalThis.cloudManager = { hasTotHEntitlementAndIsEnabled: celloEnabled };
  globalThis.loadedLangJson = {};
  globalThis.notifyPlayer = () => {};
  globalThis.getLangString = key => key;
  globalThis.StatObject = class {
    constructor(data) { this.modifiers = data.modifiers; }
  };
  globalThis.ShopTabMenu = ShopTabMenu;
  globalThis.ShopCostsAndUnlock = ShopCostsAndUnlock;
  globalThis.game = Object.assign(new Game(), {
    shop: new Shop(),
    gp: { amount: 10_000_000_000, canAfford(cost) { return this.amount >= cost; }, remove(cost) { this.amount -= cost; } },
    items: { getObjectByID: () => undefined },
    getModifierValuesFromData: data => Object.entries(data).map(([id, value]) => ({ modifier: { id }, value })),
    combat: { player }, renderQueue: {},
    prayers: { getObjectByID: id => prayers.find(prayer => prayer.id === id) },
  });
  const music = Object.assign(new Music(), {
    id: "mythMusic:Music", version: 4, level: 120, isUnlocked: true, game,
    actions: { allObjects: instruments, getObjectByID: id => instruments.find(instrument => instrument.id === id) },
    manager: Object.assign(new Manager(), {
      isMasterAncientRelicUnlocked: false,
      calculateHireCost: () => ({ costs: [10_000], unlocked: 1 }),
      getHireCostModifier: () => 0,
    }),
    bards, userInterface: { instruments: new Map() }, renderQueue: {},
    isMasteryActionUnlocked: instrument => instrument.level <= music.level,
  });
  if (!missingMusic) game.music = music;
  const ctx = {
    async loadModule(path) {
      if (path === "troupe.mjs") return core;
      if (path === "config.mjs") return config;
      if (path === "conductor.mjs") return conductor;
      if (path === "mastery.mjs") return mastery;
      if (path === "bonuses.mjs") return bonuses;
      assert.equal(path, "ui.mjs");
      return { installControls(_ctx, _music, controller) { troupe = controller; } };
    },
    onModsLoaded(fn) { hooks.mods = fn; },
    onCharacterLoaded(fn) { hooks.character = () => { unlocked = true; fn(); }; },
    gameData: { async addPackage(data) {
      for (const skill of data.data?.skillData ?? []) {
        instruments.push(...skill.data.instruments.map(instrument => ({
          ...instrument, id: `${core.namespace}:${instrument.id}`,
          modifiers: (() => {
            const modes = { standard: structuredClone(instrument.standardModifiers), hardcore: structuredClone(instrument.hardcoreModifiers) };
            return mode => modes[mode];
          })(),
        })));
      }
      for (const purchase of data.data?.shopPurchases ?? []) registry.set(`${core.namespace}:${purchase.id}`, {
        ...purchase, id: `${core.namespace}:${purchase.id}`,
        costs: { currencies: purchase.cost.currencies.map(cost => ({ ...cost, currency: game.gp })) },
        purchaseRequirements: purchase.purchaseRequirements.map(requirement => ({ ...requirement, skill: music })),
      });
    } },
    settings: { section(name) {
      if (sections.has(name)) return sections.get(name);
      const section = {
        fields: new Map(),
        add(field) { this.fields.set(field.name, { config: field, value: field.default }); },
        get(name) { return this.fields.get(name).value; },
        set(name, value) {
          const field = this.fields.get(name);
          const error = field.config.onChange(value, field.value);
          if (typeof error === "string") return error;
          field.value = value;
        },
      };
      sections.set(name, section);
      return section;
    } },
    characterStorage: {
      getItem(key) { assert(unlocked); return structuredClone(storage.get(key)); },
      setItem(key, value) { assert(unlocked); storage.set(key, structuredClone(value)); },
      removeItem(key) { assert(unlocked); storage.delete(key); },
    },
    patch(Class, name) {
      const original = Class.prototype[name];
      return {
        get(fn) {
          const getter = Object.getOwnPropertyDescriptor(Class.prototype, name).get;
          Object.defineProperty(Class.prototype, name, { configurable: true, get() { return fn.call(this, getter.bind(this)); } });
        },
        before(fn) { Class.prototype[name] = function (...args) { fn.call(this, ...args); return original.apply(this, args); }; },
        after(fn) { Class.prototype[name] = function (...args) { const result = original.apply(this, args); return fn.call(this, result, ...args) ?? result; }; },
        replace(fn) { Class.prototype[name] = function (...args) { return fn.call(this, original.bind(this), ...args); }; },
      };
    },
  };
  await setup(ctx);
  return { hooks, storage, sections, counts, instruments, band, unrelated, registry, music, player, prayers, troupe: () => troupe };
}

test("dependency is checked after all mods load, before touching shop data", async t => {
  const f = await fixture(t, { missingMusic: true });
  await assert.rejects(f.hooks.mods(), /requires \[Myth\] Music/);
  assert.equal(f.registry.size, 2);
  game.music = f.music;
  await f.hooks.mods();
  assert.ok(f.troupe());
});

test("Band Practice disappears from display and buying while existing ownership remains", async t => {
  const f = await fixture(t);
  f.counts.set(f.band, 1);
  await f.hooks.mods();
  assert.deepEqual(game.shop.purchaseDisplayOrder, [f.unrelated]);
  assert.equal(new ShopTabMenu().shouldShowItem(f.band), 0);
  assert.equal(new ShopTabMenu().shouldShowItem(f.unrelated), 1);
  game.shop.buyItemOnClick(f.band);
  assert.equal(game.shop.nativeBuys, 0);
  assert.equal(game.shop.getPurchaseCount(f.band), 1);
  assert.deepEqual(f.troupe().slots(), [1, 2]);
});

test("native purchases enforce the chain, charge 1B, and stop before redundant slots", async t => {
  const f = await fixture(t, { instrumentCount: 3 });
  await f.hooks.mods();
  const [first, second] = f.troupe().purchases;
  const initial = game.gp.amount;
  game.shop.buyItemOnClick(second);
  assert.equal(game.shop.getPurchaseCount(second), 0);
  game.shop.buyItemOnClick(first);
  assert.equal(game.gp.amount, initial - 1_000_000_000);
  assert.deepEqual(f.troupe().slots(), [1, 4]);
  f.music.manager.isMasterAncientRelicUnlocked = true;
  game.shop.buyItemOnClick(second);
  assert.equal(game.shop.getPurchaseCount(second), 0);
  assert.equal(new ShopTabMenu().shouldShowItem(second), 0);
  assert.deepEqual(f.troupe().slots(), [1, 3, 4]);
});

test("latest extra hires and upgrades save before native encoding without leaking into Music", async t => {
  const f = await fixture(t);
  await f.hooks.mods();
  assert.doesNotThrow(() => game.encode(), "storage is unavailable before character load");
  f.hooks.character();
  game.shop.buyItemOnClick(f.troupe().purchases[0]);
  assert(f.troupe().hire(f.instruments[0], 1));
  assert(f.troupe().hire(f.instruments[1], 4));
  f.music.bards.get(4).isUpgraded = true;
  const originalMap = f.music.bards.bards;
  const saved = game.encode();
  assert.deepEqual(saved.bards.map(bard => bard.slot), [1]);
  assert.deepEqual(saved.troupe.bards.map(bard => [bard.slot, bard.isUpgraded]), [[4, true]]);
  assert.equal(f.music.bards.bards, originalMap);
  assert.equal(f.music.bards.all().length, 2);
});

test("initial restoration waits for storage and restores before offline processing", async t => {
  const f = await fixture(t);
  await f.hooks.mods();
  const purchase = f.troupe().purchases[0];
  const troupe = { version: 1, bards: [{ instrument: f.instruments[1].id, slot: 4, isUpgraded: true }] };
  game.decode({ counts: [[purchase, 1]], bards: [], troupe });
  assert.equal(f.music.bards.all().length, 0);
  f.hooks.character();
  assert.equal(f.music.bards.get(4).instrument, f.instruments[1]);
  assert.equal(f.music.bards.get(4).isUpgraded, true);
  assert.equal(f.music.computations, 1);
});

test("QuickLoad replaces addon state and an older save with no addon data cannot resurrect it", async t => {
  const f = await fixture(t);
  await f.hooks.mods();
  f.hooks.character();
  const purchase = f.troupe().purchases[0];
  const first = { version: 1, bards: [{ instrument: f.instruments[1].id, slot: 4 }] };
  const second = { version: 1, bards: [{ instrument: f.instruments[2].id, slot: 4 }] };
  game.decode({ counts: [[purchase, 1]], troupe: first });
  assert.equal(f.music.bards.get(4).instrument, f.instruments[1]);
  game.decode({ counts: [[purchase, 1]], troupe: second });
  assert.equal(f.music.bards.get(4).instrument, f.instruments[2]);
  game.decode({ counts: [[purchase, 1]] });
  assert.equal(f.music.bards.get(4), undefined);
  assert.equal(f.storage.has("troupe"), false);
});

test("configured price and actual Music level apply to all new purchases without bypassing the slot chain", async t => {
  const f = await fixture(t);
  await f.hooks.mods();
  f.hooks.character();
  const settings = f.sections.get("Bardic Troupe");
  const [first, second] = f.troupe().purchases;
  f.music.level = 99;
  f.music.virtualLevel = 120;
  game.shop.buyItemOnClick(first);
  assert.equal(game.shop.getPurchaseCount(first), 0);
  settings.set("troupe-slot-price", 1234);
  settings.set("troupe-slot-level", 99);
  const gp = game.gp.amount;
  game.shop.buyItemOnClick(second);
  assert.equal(game.shop.getPurchaseCount(second), 0, "previous slot still required");
  game.shop.buyItemOnClick(first);
  game.shop.buyItemOnClick(second);
  assert.equal(game.gp.amount, gp - 2468);
  assert.deepEqual(f.troupe().slots(), [1, 4, 5]);
  assert(f.troupe().hire(f.instruments[0], 4));
  const bard = f.music.bards.get(4);
  const afterHire = game.gp.amount;
  settings.set("troupe-slot-price", 5678);
  settings.set("troupe-slot-level", 120);
  assert.deepEqual(f.troupe().slots(), [1, 4, 5]);
  assert.equal(f.music.bards.get(4), bard);
  assert.equal(game.gp.amount, afterHire, "changing prices does not charge or refund purchased slots");
});

test("saved slot settings apply on character load and QuickLoad before subsequent shop purchases", async t => {
  const f = await fixture(t);
  await f.hooks.mods();
  const [first, second] = f.troupe().purchases;
  game.decode({ settings: { "troupe-slot-price": 4321, "troupe-slot-level": 99 } });
  assert.equal(first.costs.currencies[0].cost, 1_000_000_000);
  f.hooks.character();
  assert.equal(first.costs.currencies[0].cost, 4321);
  assert.equal(first.purchaseRequirements[0].level, 99);
  const saved = game.encode();
  assert.deepEqual(saved.settings, { "troupe-slot-price": 4321, "troupe-slot-level": 99, "extra-preservation-and-doubling": false });
  const settings = f.sections.get("Bardic Troupe");
  settings.set("troupe-slot-price", 0);
  settings.set("troupe-slot-level", 120);
  game.decode(saved);
  f.music.level = 99;
  assert.equal(second.costs.currencies[0].cost, 4321);
  assert.equal(second.purchaseRequirements[0].level, 99);
  const gp = game.gp.amount;
  game.shop.buyItemOnClick(first);
  assert.equal(game.shop.getPurchaseCount(first), 1);
  assert.equal(game.gp.amount, gp - 4321);
});

test("the character setting restores before offline processing and QuickLoad defaults missing older values to OFF", async t => {
  const f = await fixture(t);
  const guitar = f.instruments[0];
  guitar.id = "mythMusic:Guitar";
  const modes = Object.fromEntries(["standard", "hardcore"].map(mode => [mode, [1, 40, 75, 99, 999].map(level => ({ level, modifiers: [] }))]));
  guitar.modifiers = mode => modes[mode];
  game.getModifierValuesFromData = data => Object.entries(data).map(([id, value]) => ({ modifier: { id }, value }));
  await f.hooks.mods();
  const name = "extra-preservation-and-doubling";
  const settings = f.sections.get("Bardic Troupe");
  game.decode({ settings: { [name]: true } });
  assert.equal(modes.standard[0].modifiers.length, 0, "saved settings wait until character restoration");
  f.hooks.character();
  assert.equal(modes.standard[0].modifiers[0].value, 5);
  const saved = game.encode();
  assert.equal(saved.settings[name], true);
  settings.set(name, false);
  assert.equal(modes.standard[0].modifiers, undefined);
  game.decode(saved);
  assert.equal(settings.get(name), true);
  assert.equal(modes.standard[0].modifiers.length, 1);
  assert.equal(modes.hardcore[0].modifiers.length, 1);
  game.decode({ settings: { "troupe-slot-price": 1234 } });
  assert.equal(settings.get(name), false, "an older save cannot reuse the enabled setting from a later save");
  assert.equal(modes.standard[0].modifiers, undefined);
  game.decode(saved);
  assert.equal(modes.standard[0].modifiers.length, 1, "reloading an enabled save adds exactly one value");
});

test("sixteenth Conductor hire, migrated final mastery, third prayer, and enhancements survive reload", async t => {
  const f = await fixture(t, { instrumentCount: 15, celloEnabled: true });
  game.gp.amount = 16_000_000_000;
  await f.hooks.mods();
  const cello = f.music.actions.getObjectByID(`${core.namespace}:Cello`);
  assert.equal(f.instruments.length, 16);
  f.storage.set("troupe", { version: 1, mastery118: [cello.id] });
  f.hooks.character();
  const mastery99 = cello.modifiers("standard").find(tier => tier.level === 99);
  assert.equal(f.music.masteryLevelCap, 99);
  assert.deepEqual(cello.modifiers("standard").map(tier => tier.level), [1, 20, 40, 65, 99, 999]);
  assert.equal(f.music.manager.isModifierActive(cello, mastery99), true);
  for (const purchase of f.troupe().purchases) game.shop.buyItemOnClick(purchase);
  assert.equal(f.troupe().slots().length, 16);
  const slot = f.troupe().slots().at(-1);
  f.music.level = 117;
  assert.equal(f.troupe().hire(cello, slot), false);
  f.music.level = 118;
  assert.equal(f.troupe().hire(cello, slot), true);
  f.music.bards.get(slot).isUpgraded = true;
  f.music.computeProvidedStats(true);
  for (const prayer of f.prayers.slice(0, 3)) f.player.togglePrayer(prayer, false);
  assert.equal(f.player.activePrayers.size, 3);
  const saved = game.encode();
  assert.deepEqual(saved.prayers, [["prayer:1", "prayer:2"]]);
  assert.deepEqual(saved.troupe.celloPrayers, ["prayer:3"]);
  assert.deepEqual(saved.troupe.mastery99, [cello.id]);
  assert.equal(saved.troupe.mastery118, undefined);
  assert.equal(saved.troupe.bards[0].instrument, cello.id);
  game.decode(saved);
  assert.equal(f.music.bards.get(slot).isUpgraded, true);
  assert.equal(f.music.manager.isModifierActive(cello, mastery99), true);
  assert.equal(f.player.activePrayers.size, 3);
  f.player.togglePrayer(f.prayers[3], false);
  assert.equal(f.player.activePrayers.size, 3);
  assert.equal(f.troupe().hire(f.instruments[0], slot), true);
  assert.equal(f.player.activePrayers.size, 2);
  game.decode(saved);
  assert.equal(f.player.activePrayers.size, 3);
  game.decode({ counts: saved.counts, prayers: saved.prayers });
  assert.equal(f.player.activePrayers.size, 2);
  assert.equal(f.music.bards.get(slot), undefined);
  assert.equal(f.music.manager.isModifierActive(cello, mastery99), false);
});

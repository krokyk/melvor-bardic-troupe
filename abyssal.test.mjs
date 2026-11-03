import assert from "node:assert/strict";
import test from "node:test";
import { installAbyssalMusic } from "./abyssal.mjs";
import { createAbyssalData } from "./abyssal-data.mjs";

async function fixture(t, { enabled = true, unlocked = true, capped = false, alreadyAdded = false } = {}) {
  const globals = ["loadedLangJson", "abyssalExp", "document", "showElement", "hideElement"];
  const previous = new Map(globals.map(key => [key, globalThis[key]]));
  t.after(() => { for (const [key, value] of previous) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  globalThis.loadedLangJson = {};
  globalThis.abyssalExp = { levelToXP: level => level ** 3 * 1000 };
  globalThis.showElement = node => { node.hidden = false; };
  globalThis.hideElement = node => { node.hidden = true; };
  const cards = new Map();
  const icon = () => ({ values: [], setXP(...args) { this.values.push(args); }, setSources(value) { this.sources = value; },
    replaceWith(value) { this.replacement = value; } });
  globalThis.document = { visibilityState: "visible", getElementById: id => cards.get(id), createElement: tag => Object.assign(icon(), { tag }) };
  const normal = { id: "melvorD:Melvor", isUnlocked: true }, abyssal = { id: "melvorItA:Abyssal", isUnlocked: unlocked };
  const instruments = [{ id: "mythMusic:Guitar", localID: "Guitar", realm: normal, level: 1, abyssalLevel: 0, baseExperience: 5 }];
  const skills = new Map();
  const target = (id, extra = {}) => {
    const skill = { id, isUnlocked: true, hasAbyssalLevels: true, level: 110, abyssalLevel: 8, ...extra };
    skills.set(id, skill); return skill;
  };
  target("melvorD:Woodcutting"); target("melvorD:Firemaking");
  const game = { gp: {}, abyssalPieces: {}, renderQueue: {}, defaultRealm: normal,
    registeredNamespaces: { hasNamespace: id => enabled && id === "melvorItA" },
    realms: { getObjectByID: id => id === abyssal.id ? abyssal : undefined },
  };
  class Rewards {
    constructor() { this._xp = new Map(); this._abyssalXP = new Map(); this.nativeItems = ["Sheet Music"]; }
    addXP(skill, amount, action) { this._xp.set(skill, { amount, action }); }
    addAbyssalXP(skill, amount, action) { this._abyssalXP.set(skill, { amount, action }); }
  }
  class Manager {
    getModifiersForApplication(instrument) { return music.level >= instrument.level ? [instrument.id] : []; }
  }
  class BaseMusic {
    onAbyssalLevelUp() { this.nativeLevels++; }
    onRealmChange() { this.nativeRealmChanges++; }
    selectRealm(realm) { this.currentRealm = realm; this.onRealmChange(); }
  }
  class Music extends BaseMusic {
    isMasteryActionUnlocked(instrument) { return this.level >= instrument.level && (!this.hasAbyssalLevels || this.abyssalLevel >= instrument.abyssalLevel); }
    train(instrument) { this.activeInstrument = instrument; this.isActive = true; this.nativeTrains++; }
    get actionRewards() {
      this.nativeRewards++;
      const rewards = new Rewards(); rewards.addXP(this, this.activeInstrument.baseExperience);
      if (this.concertPass) for (const id of this.activeInstrument.skills) { const skill = skills.get(id); if (skill?.isUnlocked) rewards.addXP(skill, 99); }
      this.nativeMastery++;
      return rewards;
    }
    computeProvidedStats() { this.computations++; }
    stop() { this.stops++; this.isActive = false; }
    decode(state) { Object.assign(this, state); }
    postDataRegistration() { this.milestones.push(...instruments); }
    sortMilestones() { this.milestones.sort((a, b) => a.level - b.level); this.abyssalMilestones.sort((a, b) => a.abyssalLevel - b.abyssalLevel); }
    renderVisibleInstruments() { throw new Error("native renderer mixes realms"); }
    renderGrants() {
      if (!this.renderQueue.grants) return;
      for (const component of this.userInterface.instruments.values()) {
        component.xpIcon.setXP(component.instrument.baseExperience, component.instrument.baseExperience);
        component.masteryPoolIcon.setRealm(normal);
      }
      this.renderQueue.grants = false; return "native grants";
    }
    modifyAbyssalXP(amount, instrument) { assert.equal(instrument.realm, abyssal); return amount * 1.5; }
    getAbyssalXPSources(instrument) { return [`AXP:${instrument.id}`]; }
  }
  const music = Object.assign(new Music(), { id: "mythMusic:Music", game, level: 99, abyssalLevel: 1, isUnlocked: true,
    currentRealm: normal, actions: { allObjects: instruments, getObjectByID: id => instruments.find(instrument => instrument.id === id), find: callback => instruments.find(callback) },
    manager: new Manager(), renderQueue: {}, milestones: [], abyssalMilestones: [], nativeRewards: 0, nativeMastery: 0,
    computations: 0, nativeTrains: 0, nativeLevels: 0, nativeRealmChanges: 0, stops: 0,
    bards: new Map([[1, "existing bard"]]), userInterface: { instruments: new Map(), locked: {} },
  });
  const capRecords = new Map([
    ["melvorItA:TheAbyss", { randomIncreases: [{ skill: skills.get("melvorD:Woodcutting"), increase: 15, maximum: 60 }] }],
    ["melvorItA:FinalDepthSetAbyssal60", { setIncreases: [{ skill: skills.get("melvorD:Woodcutting"), value: 60 }] }],
  ]);
  if (capped) game.skillLevelCapIncreases = { getObjectByID: id => capRecords.get(id) };
  if (alreadyAdded) {
    capRecords.get("melvorItA:TheAbyss").randomIncreases.push({ skill: music, increase: 15, maximum: 60 });
    capRecords.get("melvorItA:FinalDepthSetAbyssal60").setIncreases.push({ skill: music, value: 60 });
  }
  game.openPage = { action: music };
  const components = music.userInterface.instruments;
  const addComponent = instrument => {
    const localId = instrument.localID.toLowerCase(), xpIcon = Object.assign(icon(), { id: "music-xp" });
    cards.set(localId, { hidden: false });
    components.set(instrument, { instrument, localId, xpIcon, masteryPoolIcon: { setRealm(realm) { this.realm = realm; } } });
  };
  addComponent(instruments[0]);
  const hooks = [], packages = [], patches = [];
  const ctx = { async loadModule(path) { assert.equal(path, "abyssal-data.mjs"); return { createAbyssalData }; }, onInterfaceReady(callback) { hooks.push(callback); }, gameData: { async addPackage(data) {
    packages.push(data);
    for (const definition of data.data.skillData) {
      if (definition.data.hasAbyssalLevels !== undefined) music.hasAbyssalLevels = definition.data.hasAbyssalLevels;
      if (definition.data.abyssalLevelRealm !== undefined) music.abyssalLevelRealm = abyssal;
      for (const item of definition.data.instruments ?? []) {
        const instrument = { ...item, id: `KrokyBardicTroupe:${item.id}`, localID: item.id, realm: abyssal };
        instruments.push(instrument); addComponent(instrument);
      }
    }
    for (const modification of data.modifications?.skillLevelCapIncreases ?? []) {
      const record = capRecords.get(modification.id);
      for (const key of ["randomIncreases", "setIncreases"]) {
        for (const increase of modification[key]?.add ?? []) {
          const { skillID, ...values } = increase;
          assert.equal(skillID, music.id);
          record[key].push({ skill: music, ...values });
        }
      }
    }
  } }, patch(Class, name) {
    patches.push(name);
    let prototype = Class.prototype;
    while (prototype && !Object.hasOwn(prototype, name)) prototype = Object.getPrototypeOf(prototype);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    return { replace(callback) { Class.prototype[name] = function (...args) { return callback.call(this, descriptor.value.bind(this), ...args); }; },
      get(callback) { Object.defineProperty(Class.prototype, name, { configurable: true, get() { return callback.call(this, descriptor.get.bind(this)); } }); },
      after(callback) { Class.prototype[name] = function (...args) { const result = descriptor.value.apply(this, args); return callback.call(this, result, ...args) ?? result; }; },
    };
  } };
  const controller = await installAbyssalMusic(ctx, music, "KrokyBardicTroupe");
  return { music, game, normal, abyssal, instruments, controller, hooks, packages, patches, components, cards, skills, target, capRecords };
}

test("Abyssal Music registers native AXP levels and translations only with Into the Abyss", async t => {
  const absent = await fixture(t, { enabled: false });
  assert.equal(absent.controller, undefined); assert.equal(absent.packages.length, 0); assert.equal(absent.patches.length, 0);
  const f = await fixture(t);
  assert.equal(f.music.hasAbyssalLevels, true); assert.equal(f.music.abyssalLevelRealm, f.abyssal);
  assert.equal(f.controller.instruments.length, 8);
  for (const instrument of f.controller.instruments) assert.equal(loadedLangJson[`Myth_Music_Instrument_${instrument.localID}`], instrument.name);
  f.music.postDataRegistration();
  assert.deepEqual(f.music.milestones, [f.instruments[0]]);
  assert.deepEqual(f.music.abyssalMilestones, f.controller.instruments);
});

test("Abyssal checkpoints mirror Melvor rewards and scope hiring discounts to registered Abyssal instruments", async t => {
  const f = await fixture(t);
  const [{ skillID, data }] = f.packages[1].data.skillData;
  const realm = f.abyssal.id;
  assert.equal(skillID, f.music.id);
  assert.deepEqual(data.masteryPoolBonuses, [
    { realm, percent: 10, modifiers: { abyssalSkillXP: [{ skillID, value: 3 }] } },
    { realm, percent: 25, modifiers: { masteryXP: [{ skillID, realmID: realm, value: 3 }] } },
    { realm, percent: 50, modifiers: { flatSkillInterval: [{ skillID, realmID: realm, value: -250 }] } },
    { realm, percent: 95, modifiers: {
      "mythMusic:musicHireCost": f.controller.instruments.map(({ id }) => ({ skillID, actionID: id, value: -5 })),
    } },
  ]);
});

test("unlocks and hired bonuses require the realm and actual Abyssal Music level", async t => {
  const f = await fixture(t, { unlocked: false }), [first, second] = f.controller.instruments;
  assert.equal(f.music.isMasteryActionUnlocked(first), false);
  assert.deepEqual(f.music.manager.getModifiersForApplication(first), []);
  f.music.train(first); assert.equal(f.music.nativeTrains, 0);
  f.abyssal.isUnlocked = true;
  assert.equal(f.music.isMasteryActionUnlocked(first), true);
  assert.equal(f.music.isMasteryActionUnlocked(second), false);
  f.music.train(first); assert.equal(f.music.nativeTrains, 1); assert.equal(f.music.currentRealm, f.abyssal);
  f.music.abyssalLevel = second.abyssalLevel;
  assert.deepEqual(f.music.manager.getModifiersForApplication(second), [second.id]);
  f.music.onAbyssalLevelUp(); assert.equal(f.music.computations, 1); assert.equal(f.music.renderQueue.visibleInstruments, true);
  f.music.isUnlocked = false; f.music.train(second); assert.equal(f.music.nativeTrains, 1);
});

test("Ancient Relics Music follows native Abyss depth cap choices and the final level-60 unlock without duplicate entries", async t => {
  const f = await fixture(t, { capped: true });
  assert.deepEqual(f.packages[0].modifications.skillLevelCapIncreases, [
    { id: "melvorItA:TheAbyss", randomIncreases: { add: [{ skillID: "mythMusic:Music", increase: 15, maximum: 60 }] } },
    { id: "melvorItA:FinalDepthSetAbyssal60", setIncreases: { add: [{ skillID: "mythMusic:Music", value: 60 }] } },
  ]);
  assert.deepEqual(f.capRecords.get("melvorItA:TheAbyss").randomIncreases.at(-1), { skill: f.music, increase: 15, maximum: 60 });
  assert.deepEqual(f.capRecords.get("melvorItA:FinalDepthSetAbyssal60").setIncreases.at(-1), { skill: f.music, value: 60 });
  assert.equal(f.capRecords.get("melvorItA:TheAbyss").randomIncreases.length, 2);
  const existing = await fixture(t, { capped: true, alreadyAdded: true });
  assert.equal(existing.packages[0].modifications, undefined);
  assert.equal(existing.capRecords.get("melvorItA:TheAbyss").randomIncreases.length, 2);
  assert.equal(existing.capRecords.get("melvorItA:FinalDepthSetAbyssal60").setIncreases.length, 2);
});

test("Abyssal action rewards use scoped AXP and preserve native rewards and mastery exactly once", async t => {
  const f = await fixture(t), instrument = f.controller.instruments[0];
  f.music.activeInstrument = instrument; f.music.currentRealm = f.normal;
  const rewards = f.music.actionRewards;
  assert.equal(rewards._xp.has(f.music), false);
  assert.deepEqual(rewards._abyssalXP.get(f.music), { amount: instrument.baseAbyssalExperience, action: instrument });
  assert.deepEqual(rewards.nativeItems, ["Sheet Music"]);
  assert.equal(f.music.nativeRewards, 1); assert.equal(f.music.nativeMastery, 1);
  f.music.activeInstrument = f.instruments[0]; f.music.currentRealm = f.abyssal;
  const normal = f.music.actionRewards;
  assert.equal(normal._xp.get(f.music).amount, 5); assert.equal(normal._abyssalXP.size, 0);
});

test("Concert Pass uses target Abyssal levels and does not award ordinary XP in Abyssal Music", async t => {
  const f = await fixture(t), instrument = f.controller.instruments[0];
  f.music.activeInstrument = instrument; f.music.concertPass = true;
  const rewards = f.music.actionRewards;
  for (const id of instrument.skills) {
    const skill = f.skills.get(id); if (!skill) continue;
    assert.equal(rewards._xp.has(skill), false);
    assert.deepEqual(rewards._abyssalXP.get(skill), { amount: 217, action: instrument });
  }
  f.skills.get("melvorD:Firemaking").hasAbyssalLevels = false;
  assert.equal(f.music.actionRewards._abyssalXP.has(f.skills.get("melvorD:Firemaking")), false);
});

test("realm cards and native AXP icons show the corresponding instruments and mastery pool", async t => {
  const f = await fixture(t); f.hooks[0]();
  const [first, second] = f.controller.instruments, component = f.components.get(first);
  assert.equal(component.xpIcon.tag, "abyssal-xp-icon");
  f.music.renderVisibleInstruments();
  assert.equal(f.cards.get("guitar").hidden, false); assert.equal(f.cards.get(first.localID.toLowerCase()).hidden, true);
  f.music.selectRealm(f.abyssal); f.music.renderVisibleInstruments();
  assert.equal(f.cards.get("guitar").hidden, true); assert.equal(f.cards.get(first.localID.toLowerCase()).hidden, false);
  assert.equal(f.cards.get(second.localID.toLowerCase()).hidden, true);
  assert.equal(f.music.userInterface.locked.level, `${second.abyssalLevel} (Abyssal)`);
  f.music.renderQueue.grants = true;
  assert.equal(f.music.renderGrants(), "native grants");
  assert.deepEqual(component.xpIcon.values.at(-1), [first.baseAbyssalExperience * 1.5, first.baseAbyssalExperience]);
  assert.deepEqual(component.xpIcon.sources, [`AXP:${first.id}`]); assert.equal(component.masteryPoolIcon.realm, f.abyssal);
  f.music.selectRealm(f.normal); f.game.openPage = { id: "Bank" }; f.music.renderVisibleInstruments();
  assert.equal(f.music.renderQueue.visibleInstruments, true);
  f.game.openPage = { action: f.music }; f.music.renderVisibleInstruments(); assert.equal(f.cards.get("guitar").hidden, false);
});

test("save restoration stops a locked Abyssal action without discarding existing hired bards", async t => {
  const f = await fixture(t), last = f.controller.instruments.at(-1);
  f.music.decode({ activeInstrument: last, isActive: true, abyssalLevel: 1, abyssalXP: 1234 });
  assert.equal(f.music.activeInstrument, undefined); assert.equal(f.music.stops, 1); assert.equal(f.music.bards.get(1), "existing bard");
  const first = f.controller.instruments[0];
  f.music.decode({ activeInstrument: first, isActive: true, abyssalLevel: 1, abyssalXP: 5678, currentRealm: f.abyssal });
  assert.equal(f.music.activeInstrument, first); assert.equal(f.music.isActive, true); assert.equal(f.music.abyssalXP, 5678);
  assert.equal(f.music.currentRealm, f.abyssal); assert.equal(f.music.bards.get(1), "existing bard");
});

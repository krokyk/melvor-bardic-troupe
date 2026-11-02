import assert from "node:assert/strict";
import test from "node:test";
import { installMusicRealms } from "./music-realms.mjs";

class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.textContent = ""; }
  get src() { return this.attributes.src; }
  set src(value) { this.attributes.src = value; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  replaceChildren(...nodes) { for (const node of this.children) node.parentElement = undefined; this.children = []; this.append(...nodes); }
  querySelector(selector) {
    assert.equal(selector, 'small > img[src$="/coins.svg"]');
    return descendants(this).find(node => node.tag === "img" && node.parentElement?.tag === "small" && node.src?.endsWith("/coins.svg"));
  }
}
const descendants = node => [node, ...node.children.flatMap(descendants)];

function fixture(t, { entitlement = true, unlocked = true, pieces = true, realm = true } = {}) {
  const originalDocument = globalThis.document, originalFormat = globalThis.numberWithCommas, originalRoll = globalThis.rollInteger;
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
    if (originalFormat === undefined) delete globalThis.numberWithCommas; else globalThis.numberWithCommas = originalFormat;
    if (originalRoll === undefined) delete globalThis.rollInteger; else globalThis.rollInteger = originalRoll;
  });
  const normal = { id: "melvorD:Melvor", isUnlocked: true }, abyssal = { id: "melvorItA:Abyssal", isUnlocked: unlocked };
  const currency = (name, media) => ({ name, media, amount: 1000, earned: 0, add(amount) { this.amount += amount; }, remove(amount) { this.amount -= amount; } });
  const gp = currency("GP", "https://game.test/coins.svg"), ap = currency("Abyssal Pieces", "https://game.test/abyssal-pieces.svg");
  const instruments = [137, 281, 101].map((amount, index) => ({ id: `music:${index}`, localID: `Instrument${index}`, realm: index ? abyssal : normal, amount, baseExperience: 20 + index }));
  const cards = new Map(), components = new Map();
  for (const instrument of instruments) {
    const card = new Node("div"), row = new Node("small"), icon = new Node("img"), nativeLabel = new Node("text");
    icon.src = "https://cdn.melvor.net/core/v018/assets/media/main/coins.svg"; row.append(icon, nativeLabel); card.append(row);
    cards.set(instrument.localID.toLowerCase(), card);
    components.set(instrument, { localId: instrument.localID.toLowerCase(), minGP: 0, maxGP: 0, nativeLabel, icon, row, updates: 0,
      getMinGPRoll() { return instrument.amount; }, getMaxGPRoll() { return instrument.amount * 100; },
      updateGPRange() { this.updates++; this.minGP = instrument.amount; this.maxGP = instrument.amount * 100; this.nativeLabel.textContent = `${this.minGP}-${this.maxGP} GP`; } });
  }
  const game = { gp, abyssalPieces: pieces ? ap : undefined, currentRealm: normal, renderQueue: {},
    registeredNamespaces: { hasNamespace: id => id === "melvorItA" && entitlement },
    realms: { getObjectByID: id => id === abyssal.id && realm ? abyssal : undefined },
  };
  class Rewards {
    constructor() { this._currencies = new Map(); this.xp = new Map(); this.items = new Map(); this.actionInterval = 3000; this.source = "Native Music"; }
    addCurrency(currency, amount) { this._currencies.set(currency, (this._currencies.get(currency) ?? 0) + amount); }
    addGP(amount) { this.addCurrency(gp, amount); }
    recordSkillCurrencyStats() { for (const [currency, amount] of this._currencies) currency.earned += amount; }
    giveRewards() { for (const [currency, amount] of this._currencies) currency.add(amount); }
  }
  class BaseSkill {
    getRealmOptions() { return this.originalOptions; }
    onRealmChange() { this.headerUpdates = (this.headerUpdates ?? 0) + 1; }
    selectRealm(realm) { this.currentRealm = realm; this.onRealmChange(); }
    shouldShowSkillInSidebar() { return this.getRealmOptions().includes(game.currentRealm); }
  }
  class Manager {
    constructor(music) { this.music = music; }
    getGoldToAward(instrument) {
      this.music.rolls++; this.music.nativeGoldCalls++;
      assert.equal(game.gp, gp, "native amount calculation retains the actual GP object");
      return Math.floor(instrument.amount * (1 + this.music.gpPercent / 100)) + this.music.gpFlat;
    }
  }
  class Music extends BaseSkill {
    constructor() {
      super(); this.game = game; this.currentRealm = normal; this.originalOptions = [normal]; this.activeInstrument = instruments[0];
      this.userInterface = { instruments: components }; this.renderQueue = { gpRange: true }; this.rewardCalls = 0; this.rolls = 0; this.events = [];
      this.actionTimer = { ticksLeft: 17, maxTicks: 30 }; this.isActive = true;
      this.manager = new Manager(this); this.nativeGoldCalls = 0; this.gpPercent = 0; this.gpFlat = 0; this.apPercent = 0; this.apFlat = 0;
    }
    getCurrencyModifier(currency) { assert.equal(currency, ap); return this.apPercent; }
    modifyCurrencyReward(currency, amount, instrument) {
      assert.equal(currency, ap); assert.equal(instrument.realm, abyssal);
      return Math.max(0, Math.floor(amount * (1 + this.apPercent / 100)) + this.apFlat);
    }
    get actionRewards() {
      this.rewardCalls++;
      const rewards = new Rewards(); rewards.xp.set(this, this.activeInstrument.baseExperience); rewards.items.set("native-drop", 1);
      rewards.addGP(this.manager.getGoldToAward(this.activeInstrument)); this.events.push(this.activeInstrument); return rewards;
    }
    renderGPRange() { if (!this.renderQueue.gpRange) return; for (const component of components.values()) component.updateGPRange(); this.renderQueue.gpRange = false; return "native-result"; }
  }
  const music = new Music(), hooks = [], patched = []; game.openPage = { action: music };
  const ctx = { onInterfaceReady(callback) { hooks.push(callback); }, patch(Class, method) {
    patched.push(method);
    const descriptor = Object.getOwnPropertyDescriptor(Class.prototype, method) ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Class.prototype), method);
    return { get(callback) { Object.defineProperty(Class.prototype, method, { configurable: true, get() { return callback.call(this, descriptor.get.bind(this)); } }); },
      replace(callback) { Class.prototype[method] = function (...args) { return callback.call(this, descriptor.value.bind(this), ...args); }; },
      after(callback) { Class.prototype[method] = function (...args) { const result = descriptor.value.apply(this, args); callback.call(this, result, ...args); return result; }; },
    };
  } };
  globalThis.document = { getElementById: id => cards.get(id), createTextNode: text => Object.assign(new Node("text"), { textContent: text }) };
  globalThis.numberWithCommas = value => value.toLocaleString("en-US");
  globalThis.rollInteger = (min, max) => { assert(min <= max); music.rolls++; return min; };
  installMusicRealms(ctx, music);
  return { music, game, gp, ap, normal, abyssal, instruments, components, cards, hooks, patched, Music, Rewards };
}

test("Abyssal instruments award AP without rerolling, duplicating rewards or changing native action progress", t => {
  const m = fixture(t), timer = m.music.actionTimer; m.music.selectRealm(m.abyssal);
  m.music.activeInstrument = m.instruments[1];
  const rewards = m.music.actionRewards;
  assert.equal(m.music.rewardCalls, 1); assert.equal(m.music.rolls, 1); assert.equal(m.music.events.length, 1);
  assert.equal(rewards._currencies.has(m.gp), false); assert.equal(rewards._currencies.get(m.ap), 281);
  assert.deepEqual([...rewards.xp], [[m.music, 21]]); assert.deepEqual([...rewards.items], [["native-drop", 1]]);
  assert.equal(rewards.actionInterval, 3000); assert.equal(rewards.source, "Native Music");
  rewards.recordSkillCurrencyStats(); rewards.giveRewards();
  assert.equal(m.gp.amount, 1000); assert.equal(m.gp.earned, 0); assert.equal(m.ap.amount, 1281); assert.equal(m.ap.earned, 281);
  assert.equal(m.music.actionTimer, timer); assert.equal(timer.ticksLeft, 17); assert.equal(m.music.isActive, true);
  assert.equal(m.music.nativeGoldCalls, 0, "AP does not inherit native GP modifiers");
});

test("normal Music and every extra training instrument retain the correct currency independently of the global realm", t => {
  const m = fixture(t); m.game.currentRealm = m.abyssal;
  let rewards = m.music.actionRewards; assert.equal(rewards._currencies.get(m.gp), 137); assert.equal(rewards._currencies.has(m.ap), false);
  m.music.selectRealm(m.abyssal); m.game.currentRealm = m.normal;
  for (const instrument of m.instruments) { m.music.activeInstrument = instrument; rewards = m.music.actionRewards; rewards.giveRewards(); }
  assert.equal(m.ap.amount, 1382); assert.equal(m.gp.amount, 1137); assert.equal(m.music.rolls, 4);
  m.music.selectRealm(m.normal); rewards = m.music.actionRewards;
  assert.equal(rewards._currencies.get(m.ap), 101); assert.equal(rewards._currencies.has(m.gp), false);
  m.gp.add(7); m.gp.remove(5); assert.equal(m.gp.amount, 1139, "non-training GP gains and purchases keep their native currency");
  const outsider = new m.Music(); outsider.currentRealm = m.abyssal;
  assert.equal(outsider.actionRewards._currencies.get(m.gp), 137, "the patch owns only this Music instance");
});

test("Music supports the unlocked registered Abyssal realm through native options and updates its range queue on realm changes", t => {
  const m = fixture(t), original = m.music.originalOptions;
  assert.deepEqual(m.music.getRealmOptions(), [m.normal, m.abyssal]); assert.deepEqual(original, [m.normal]);
  m.game.currentRealm = m.abyssal; assert.equal(m.music.shouldShowSkillInSidebar(), true);
  m.music.renderQueue.gpRange = false; m.game.renderQueue.sidebarSkillOpacity = false; m.music.selectRealm(m.abyssal);
  assert.equal(m.music.headerUpdates, 1); assert.equal(m.music.renderQueue.gpRange, true); assert.equal(m.game.renderQueue.sidebarSkillOpacity, true);
  m.abyssal.isUnlocked = false; assert.equal(m.music.getRealmOptions(), original); assert.equal(m.music.shouldShowSkillInSidebar(), false);
  assert.equal(m.music.actionRewards._currencies.get(m.gp), 137);
  m.music.originalOptions = [m.normal, m.abyssal];
  assert.deepEqual(m.music.getRealmOptions(), [m.normal], "registered Abyssal mastery actions do not expose a locked realm");
  assert.deepEqual(m.music.originalOptions, [m.normal, m.abyssal]);
  m.abyssal.isUnlocked = true; assert.equal(m.music.getRealmOptions(), m.music.originalOptions);
});

test("instrument ranges use their own currency while detached native bindings cannot overwrite the label", t => {
  const m = fixture(t); m.hooks[0]();
  const component = m.components.get(m.instruments[0]), row = component.row, label = row.children[1], icon = component.icon;
  assert.equal(label.textContent, "137-13,700 GP"); assert.equal(icon.src, m.gp.media);
  m.music.selectRealm(m.abyssal); assert.equal(m.music.renderGPRange(), "native-result");
  assert.equal(row.children[1], label); assert.equal(row.children[0], icon); assert.equal(label.textContent, "137-13,700 GP");
  assert.equal(icon.src, m.gp.media); assert.equal(icon.alt, m.gp.name); assert.match(row.getAttribute("aria-label"), /GP/);
  component.nativeLabel.textContent = "obsolete native GP binding";
  assert.equal(label.textContent, "137-13,700 GP"); assert.equal(component.nativeLabel.parentElement, undefined);
  const updates = component.updates; m.music.renderGPRange(); assert.equal(component.updates, updates);
  m.music.selectRealm(m.normal); m.music.renderGPRange(); assert.equal(label.textContent, "137-13,700 GP"); assert.equal(icon.src, m.gp.media);
  const abyssal = m.components.get(m.instruments[1]);
  assert.equal(abyssal.row.children[1].textContent, "281-28,100 AP"); assert.equal(abyssal.icon.src, m.ap.media);
});

test("AP percentages and flat gains affect both real payouts and displayed ranges, independently of GP modifiers", t => {
  const m = fixture(t); m.music.gpPercent = 500; m.music.gpFlat = 1000; m.music.apPercent = 20; m.music.apFlat = 7;
  m.hooks[0](); m.music.activeInstrument = m.instruments[1];
  assert.equal(m.music.actionRewards._currencies.get(m.ap), 344);
  assert.equal(m.components.get(m.instruments[1]).row.children[1].textContent, "344-33,727 AP");
  assert.equal(m.components.get(m.instruments[1]).getGPModifier(), 20);
  m.music.activeInstrument = m.instruments[0]; m.music.selectRealm(m.abyssal);
  assert.equal(m.music.actionRewards._currencies.get(m.gp), 1822);
});

test("ItA, AP currency and registered realm guards leave unsupported Music entirely native", t => {
  for (const options of [{ entitlement: false }, { pieces: false }, { realm: false }]) {
    const m = fixture(t, options); m.music.currentRealm = m.abyssal;
    assert.equal(m.patched.length, 0); assert.equal(m.hooks.length, 0);
    assert.equal(m.music.actionRewards._currencies.get(m.gp), 137); assert.deepEqual(m.music.getRealmOptions(), [m.normal]);
  }
});

test("Music training range UI waits off-page, hidden and offline without changing payouts and catches up once visible", t => {
  const m = fixture(t); m.music.activeInstrument = m.instruments[1]; m.music.selectRealm(m.abyssal); m.game.openPage = { id: "Bank" }; m.hooks[0]();
  for (const suppress of [() => { m.game.openPage = { id: "Bank" }; }, () => { document.visibilityState = "hidden"; },
    () => { m.game._isInOnlineLoop = false; }, () => { m.game.enableRendering = false; }]) {
    m.game.openPage = { action: m.music }; document.visibilityState = "visible"; m.game._isInOnlineLoop = true; m.game.enableRendering = true;
    suppress(); for (let frame = 0; frame < 50; frame++) m.music.renderGPRange();
    assert.equal(m.music.renderQueue.gpRange, true);
    assert.equal([...m.components.values()].every(component => component.updates === 0 && component.minGP === 0 && component.maxGP === 0), true);
    assert.equal(m.music.actionRewards._currencies.get(m.ap), 281, "native training amounts do not depend on deferred presentation fields");
  }
  m.game.openPage = { action: m.music }; document.visibilityState = "visible"; m.game._isInOnlineLoop = true; m.game.enableRendering = true;
  m.music.renderGPRange();
  assert.equal(m.music.renderQueue.gpRange, false); assert.equal(m.components.get(m.instruments[0]).updates, 1);
  assert.equal(m.components.get(m.instruments[1]).row.children[1].textContent, "281-28,100 AP");
  m.music.renderGPRange(); assert.equal(m.components.get(m.instruments[0]).updates, 1);
});

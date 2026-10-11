import assert from "node:assert/strict";
import test from "node:test";
import { installControls } from "./ui.mjs";

class Node {
  constructor(tag) { this.tag = tag; this.nodes = []; this.attributes = {}; this.innerHTML = ""; }
  get children() { return this.nodes.filter(node => node instanceof Node); }
  get textContent() { return this.nodes.map(node => node instanceof Node ? node.textContent : node).join(""); }
  set textContent(value) { this.replaceChildren(String(value)); }
  append(...nodes) { for (const node of nodes) if (node instanceof Node) node.parent = this; this.nodes.push(...nodes); }
  prepend(...nodes) { for (const node of nodes) if (node instanceof Node) node.parent = this; this.nodes.unshift(...nodes); }
  replaceChildren(...nodes) { for (const node of this.children) node.parent = undefined; this.nodes = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  after(node) { this.sibling = node; }
  click() { if (this.disabled) return; this.onclick?.(); this.parent?.click(); }
  querySelectorAll(selector) {
    assert.equal(selector, "button");
    return descendants(this).slice(1).filter(node => node.tag === "button");
  }
  querySelector(selector) {
    assert.equal(selector, ".bardic-troupe-upgrade-indicator");
    return indicators(this).find(node => node !== this) ?? null;
  }
}

function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}

function indicators(node) {
  return descendants(node).filter(child => child.className?.split(" ").includes("bardic-troupe-upgrade-indicator"));
}

function rosterIndicators(f) {
  return indicators(descendants(f.native.sibling).find(node => node.id === "bardic-troupe-slots"));
}

function rosterCard(f, number = 2) {
  return descendants(f.native.sibling).find(node => node.id === "bardic-troupe-slots").children[number - 1];
}

function rosterButton(f, label, number = 2) {
  return descendants(rosterCard(f, number)).find(node => node.tag === "button" && node.textContent.trim() === label);
}

function fixture(t, { masteryLabel = "Mastery" } = {}) {
  const originals = { document: globalThis.document, SwalLocale: globalThis.SwalLocale, getLangString: globalThis.getLangString };
  t.after(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const native = new Node("div");
  native.append(new Node("native-bard-component"));
  const elements = new Map([["bard-container", native]]);
  globalThis.document = { createElement: tag => new Node(tag), getElementById: id => elements.get(id) };
  globalThis.getLangString = key => key === "Myth_Music_Mastery" ? masteryLabel : key;
  const swal = globalThis.SwalLocale = {
    closed: false,
    calls: [],
    result: Symbol("native modal result"),
    fire(options) { this.options = options; this.calls.push({ receiver: this, options }); return this.result; },
    getPopup() { return this.popup; },
    close() { this.closed = true; }
  };
  const instrument = { name: "<img onerror=alert(1)>", media: "instrument.svg", id: "music:lute" };
  const existing = {
    instrument: { name: "Harp", media: "harp.svg", id: "music:harp" },
    slot: 4,
    isUpgraded: true,
    socket: { name: "Polished Ruby Gem", media: "ruby.svg" },
    utility: { name: "<Pristine Leather>", media: "leather.svg" }
  };
  const bards = new Map([[4, existing]]);
  const modifiers = new Map();
  const masteryLevels = new Map();
  const instrumentButtons = new Map();
  const nativeMasteryCalls = [];
  const instruments = new Map([existing.instrument, instrument].map((target, index) => {
    const localId = `instrument-${index}`;
    const card = new Node("div");
    const buttons = ["Train", "Hire", masteryLabel].map(label => {
      const button = new Node("button"); button.textContent = ` ${label} `; return button;
    });
    buttons[2].onclick = () => nativeMasteryCalls.push(target);
    card.append(...buttons);
    elements.set(localId, card);
    instrumentButtons.set(target, { train: buttons[0], hire: buttons[1], mastery: buttons[2] });
    modifiers.set(target, [{ description: "<b>Native modifier</b>", isActive: true }]);
    masteryLevels.set(target, 1);
    return [target, { localId }];
  }));
  const nativeModalCalls = [];
  const nativeOpens = [];
  function openNativeModal(kind, target, receiver) {
    const call = { kind, target, receiver, fire: swal.fire };
    call.options = {
      html: `<div id="myth-music-${kind}-container"></div>`,
      showConfirmButton: false,
      customClass: { popup: "native-popup" },
      didOpen(popup) {
        nativeOpens.push({ kind, target: kind === "equipment" ? bridge.bard : target, receiver: this, popup });
      }
    };
    nativeModalCalls.push(call);
    return swal.fire(call.options);
  }
  const bridge = {
    setBard(bard) { this.bard = bard; },
    equipment() { return openNativeModal("equipment", this.bard, this); }
  };
  class Music {}
  const music = Object.assign(new Music(), {
    bards: { get: slot => bards.get(slot), isHired: () => false },
    userInterface: { bard1: bridge, instruments },
    manager: { getModifiers: target => modifiers.get(target) ?? [] },
    getMasteryLevel: target => masteryLevels.get(target) ?? 1,
    unlockMastery(target) { return openNativeModal("mastery", target, this); },
    renderQueue: { bardModifiers: true }
  });
  const troupe = {
    slots: () => [1, 4],
    hireCost: () => 10000,
    succeeds: false,
    hire(candidate, slot) { this.request = { candidate, slot }; return this.succeeds; }
  };
  const patches = new Map();
  const ctx = {
    patch: (_class, name) => ({ replace: callback => patches.set(name, callback) }),
    onInterfaceReady(callback) { this.ready = callback; }
  };
  installControls(ctx, music, troupe);
  const refresh = () => { music.renderQueue.bardModifiers = true; patches.get("renderBardModifiers")(); };
  function didOpen(expectedSelector, { missingButton = false } = {}) {
    const priorOpens = nativeOpens.length;
    const queries = [];
    let clicks = 0;
    const receiver = {};
    const popup = {
      listeners: new Map(),
      addEventListener(name, callback) { this.listeners.set(name, callback); },
      querySelector(selector) {
        assert.equal(nativeOpens.length, priorOpens + 1, "mount the native component before querying its submenu");
        queries.push(selector);
        assert.equal(selector, expectedSelector);
        return missingButton ? null : { click() { clicks++; } };
      }
    };
    swal.popup = popup;
    swal.options.didOpen.call(receiver, popup);
    assert.equal(nativeOpens.at(-1).receiver, receiver, "preserve the native didOpen receiver");
    assert.equal(nativeOpens.at(-1).popup, popup);
    return { queries, clicks };
  }
  return { native, swal, instrument, existing, bards, bridge, music, troupe, patches, ctx, modifiers, masteryLevels, instrumentButtons, nativeMasteryCalls, nativeModalCalls, nativeOpens, refresh, didOpen };
}

test("roster retains native controls and opens each enhancement submenu for the correct extra bard", t => {
  const f = fixture(t);
  f.existing.isUpgraded = false;
  f.patches.get("renderBardModifiers")();
  assert.equal(f.music.renderQueue.bardModifiers, true, "do not consume rendering before mounting");
  f.ctx.ready();
  assert.equal(f.native.hidden, true);
  assert.equal(f.native.children.length, 1, "retain controls needed by Music's decoder");
  const cards = descendants(f.native.sibling).find(node => node.id === "bardic-troupe-slots").children;
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map(card => card.children[0].children[0].textContent), ["Slot 1", "Slot 2"]);
  const fire = f.swal.fire;
  for (const [label, state] of [["Upgrade", "upgrade"], ["Socket:", "socket"], ["Utility:", "utility"]]) {
    const button = rosterButton(f, label);
    assert.equal(button.onclick(), f.swal.result, "preserve the native modal return value");
    assert.equal(f.swal.fire, fire, "restore fire before the native didOpen callback runs");
    const call = f.nativeModalCalls.at(-1);
    assert.equal(call.receiver, f.bridge);
    assert.equal(call.target, f.existing);
    assert.equal(f.swal.calls.at(-1).receiver, f.swal);
    assert.notEqual(call.fire, fire, "wrap fire only while opening this native modal");
    assert.notEqual(f.swal.options, call.options, "do not mutate Music's options");
    assert.equal(f.swal.options.html, call.options.html);
    assert.equal(f.swal.options.customClass, call.options.customClass);
    assert.equal(f.swal.options.showConfirmButton, false);
    f.refresh();
    assert.equal(f.music.renderQueue.bardModifiers, false);
    assert.equal(f.bridge.bard, f.existing, "roster renders must retain the bard until native didOpen");
    assert.deepEqual(f.didOpen(`.myth-music-equipment .manage > .${state} > button`), {
      queries: [`.myth-music-equipment .manage > .${state} > button`], clicks: 1
    });
    assert.equal(f.nativeOpens.at(-1).target, f.existing);
    assert.equal(f.swal.fire, fire);
  }
  const unrelated = { titleText: "Another modal" };
  f.swal.fire(unrelated);
  assert.equal(f.swal.options, unrelated, "future modals must use the unwrapped native fire");
});

test("roster starts collapsed and retains its toggle and visibility when bonuses refresh", t => {
  const f = fixture(t);
  f.ctx.ready();
  const nodes = descendants(f.native.sibling);
  const toggle = nodes.find(node => node.attributes["aria-controls"] === "bardic-troupe-slots");
  const body = nodes.find(node => node.className === "block-content block-content-full");
  const eye = toggle.children[0].children[0];
  assert.equal(toggle.attributes["aria-expanded"], "false");
  assert.equal(toggle.attributes["aria-label"], "Show bard slots");
  assert.equal(body.hidden, true);
  assert.equal(eye.className, "far fa-eye-slash mr-2");
  assert(nodes.some(node => node.textContent === "1/2 hired"));
  toggle.onclick();
  assert.equal(toggle.attributes["aria-expanded"], "true");
  assert.equal(toggle.attributes["aria-label"], "Hide bard slots");
  assert.equal(body.hidden, false);
  assert.equal(eye.className, "far fa-eye mr-2");
  f.patches.get("renderBardModifiers")();
  assert(descendants(f.native.sibling).includes(toggle), "keep the focused toggle mounted");
  assert.equal(body.hidden, false);
  toggle.onclick();
  f.music.renderQueue.bardModifiers = true;
  f.patches.get("renderBardModifiers")();
  assert.equal(body.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
});

test("the full header is one native button with the eye on the left and every region toggles once", t => {
  const f = fixture(t);
  f.ctx.ready();
  const toggle = descendants(f.native.sibling).find(node => node.attributes["aria-controls"] === "bardic-troupe-slots");
  assert.equal(toggle.tag, "button");
  assert.equal(toggle.type, "button", "use native Enter and Space activation without form submission");
  assert(toggle.className.includes("block-header") && toggle.className.includes("w-100"));
  assert.equal(descendants(toggle).filter(node => node.tag === "button").length, 1, "no nested buttons");
  const [eye, label, count] = toggle.children[0].children;
  assert.equal(eye.tag, "i");
  assert.equal(eye.attributes["aria-hidden"], "true");
  assert.equal(label.textContent, "Toggle Bardic Troupe");
  assert.equal(count.textContent, "1/2 hired");
  for (const [index, region] of [eye, label, count, toggle].entries()) {
    region.click();
    assert.equal(toggle.attributes["aria-expanded"], String(index % 2 === 0));
  }
});

test("hire dialog uses safe labels, offers every slot, and rechecks hiring on each click", t => {
  const f = fixture(t);
  f.patches.get("hire")(undefined, f.instrument);
  const nodes = descendants(f.swal.options.html);
  assert(nodes.some(node => node.textContent === `Hire ${f.instrument.name} Bard?`));
  assert(nodes.every(node => !node.innerHTML.includes(f.instrument.name)));
  assert(nodes.some(node => node.innerHTML === "<b>Native modifier</b>"));
  const choices = nodes.filter(node => node.tag === "button");
  assert.deepEqual(choices.map(node => node.textContent), ["Hire in slot 1", "Replace Harp (slot 2)"]);
  choices[1].onclick();
  assert.deepEqual(f.troupe.request, { candidate: f.instrument, slot: 4 });
  assert.equal(f.swal.closed, false);
  assert(nodes.some(node => node.attributes.role === "status" && node.textContent.includes("Could not hire")));
  f.troupe.succeeds = true;
  choices[1].onclick();
  assert.equal(f.swal.closed, true);
});

test("an unavailable instrument cannot show hire buttons", t => {
  const f = fixture(t);
  f.troupe.hireCost = () => undefined;
  f.patches.get("hire")(undefined, f.instrument);
  assert.equal(f.swal.options.icon, "warning");
  assert.equal(f.swal.options.html, undefined);
});

test("roster Mastery shortcuts respect exact tier thresholds and open the matching canonical native row", t => {
  const f = fixture(t);
  const instrument = f.existing.instrument;
  const bonuses = [40, 75, 99].map(level => ({ level, isActive: false, isUpgrade: false, description: `Tier ${level}` }));
  f.modifiers.set(instrument, [
    { level: 1, isActive: true, isUpgrade: false, description: "Base bonus" },
    ...bonuses,
    { level: 999, isActive: false, isUpgrade: true, description: "Essence enhancement" },
  ]);
  f.ctx.ready();
  const buttonMarker = indicators(f.instrumentButtons.get(instrument).mastery)[0];
  assert.equal(buttonMarker.hidden, true);
  assert.equal(rosterIndicators(f).length, 0);
  assert.deepEqual(descendants(rosterCard(f)).filter(node => node.tag === "button" && node.textContent.startsWith("Mastery ")).map(node => node.textContent), ["Mastery 40", "Mastery 75", "Mastery 99"]);
  for (const level of [40, 75, 99]) {
    const button = rosterButton(f, `Mastery ${level}`);
    assert(button.className.includes("btn-outline-secondary"));
    assert.equal(button.disabled, true, "all mastery tiers start locked at level 1");
  }
  const fire = f.swal.fire;
  for (const [index, bonus] of bonuses.entries()) {
    const label = `Mastery ${bonus.level}`;
    f.masteryLevels.set(instrument, bonus.level - 1);
    f.refresh();
    const locked = rosterButton(f, label);
    assert(locked.className.includes("btn-outline-secondary"));
    assert.equal(locked.disabled, true);
    const callsBefore = f.nativeModalCalls.length;
    locked.onclick();
    assert.equal(f.nativeModalCalls.length, callsBefore, "programmatic clicks below the threshold cannot open a modal");
    f.masteryLevels.set(instrument, bonus.level);
    f.refresh();
    const available = rosterButton(f, label);
    assert(available.className.includes("btn-outline-success"));
    assert.equal(available.disabled, false);
    assert.equal(available.type, "button");
    assert.equal(available.attributes["aria-label"], `Harp: ${label}. Mastery bonus available to unlock (costs still apply).`);
    assert.equal(available.parent.children.at(-1).innerHTML, bonus.description);
    assert.equal(buttonMarker.hidden, false);
    assert.equal(available.onclick(), f.swal.result);
    assert.equal(f.swal.fire, fire);
    assert.equal(f.nativeModalCalls.at(-1).receiver, f.music);
    assert.equal(f.nativeModalCalls.at(-1).target, instrument);
    const selector = `.myth-music-mastery .manage > .manage-section:nth-child(${index + 2}) > button`;
    assert.deepEqual(f.didOpen(selector), { queries: [selector], clicks: 1 });
    bonus.isActive = true;
    f.refresh();
    const purchased = rosterButton(f, label);
    assert(purchased.className.includes("btn-success"));
    assert.equal(purchased.disabled, true);
    assert.equal(purchased.title, "Mastery bonus unlocked.");
    const callsBeforePurchaseClick = f.nativeModalCalls.length;
    purchased.onclick();
    assert.equal(f.nativeModalCalls.length, callsBeforePurchaseClick, "an unlocked tier must not open another menu");
  }
  assert.equal(rosterIndicators(f).length, 0, "roster buttons replace the old row notes");
  assert.equal(f.troupe.request, undefined, "rendering does not hire or purchase anything");
  assert.equal(f.nativeMasteryCalls.length, 0);
});

test("mastery indicators refresh after bonus purchases and mastery rollback while another tier remains eligible", t => {
  const f = fixture(t);
  const instrument = f.existing.instrument;
  const bonuses = [40, 75].map(level => ({ level, isActive: false, isUpgrade: false, description: `Tier ${level}` }));
  f.modifiers.set(instrument, bonuses);
  f.masteryLevels.set(instrument, 99);
  f.ctx.ready();
  const button = f.instrumentButtons.get(instrument).mastery;
  const marker = indicators(button)[0];
  assert.equal(marker.hidden, false);
  assert.equal(rosterIndicators(f).length, 0);
  bonuses[0].isActive = true;
  f.refresh();
  assert.equal(marker.hidden, false, "the second eligible tier still needs attention");
  assert(rosterButton(f, "Mastery 40").className.includes("btn-success"));
  assert(rosterButton(f, "Mastery 75").className.includes("btn-outline-success"));
  bonuses[1].isActive = true;
  f.refresh();
  assert.equal(marker.hidden, true);
  assert.equal(rosterIndicators(f).length, 0);
  bonuses[0].isActive = false;
  f.masteryLevels.set(instrument, 39);
  f.refresh();
  assert.equal(marker.hidden, true);
  assert.equal(rosterIndicators(f).length, 0);
  f.masteryLevels.set(instrument, 40);
  f.refresh();
  assert.equal(marker.hidden, false);
  assert(rosterButton(f, "Mastery 40").className.includes("btn-outline-success"));
  assert.deepEqual(indicators(button), [marker], "refresh the cached native marker without duplicating it");
});

test("unhired instruments retain a localized native Mastery button and one cached marker after label injection", t => {
  const f = fixture(t, { masteryLabel: "Meisterung" });
  const instrument = f.instrument;
  f.modifiers.set(instrument, [{ level: 40, isActive: false, isUpgrade: false, description: "Available" }]);
  f.masteryLevels.set(instrument, 40);
  const buttons = f.instrumentButtons.get(instrument);
  const component = f.music.userInterface.instruments.get(instrument);
  const card = document.getElementById(component.localId);
  card.replaceChildren(buttons.hire, buttons.mastery, buttons.train);
  f.ctx.ready();
  assert.equal(rosterIndicators(f).length, 0, "an unhired instrument has no roster row");
  const marker = indicators(buttons.mastery)[0];
  assert(marker, "find the translated native label independently of button order");
  assert.equal(marker.hidden, false);
  assert.equal(marker.attributes.role, "img");
  assert.equal(marker.title, "Mastery bonus available to unlock (costs still apply).");
  assert.equal(buttons.mastery.textContent.trim(), "♫ Meisterung", "prepending changes the native button's combined label");
  f.refresh(); f.refresh();
  assert.deepEqual(indicators(buttons.mastery), [marker]);
  assert.equal(indicators(buttons.hire).length, 0);
  assert.equal(indicators(buttons.train).length, 0);
  marker.click();
  assert.deepEqual(f.nativeMasteryCalls, [instrument], "the new child still bubbles to Music's existing click handler");
  f.masteryLevels.set(instrument, 39);
  f.refresh();
  assert.equal(marker.hidden, true, "cached marker updates even though its injection changed the matching text");
});

test("enhancement shortcuts show applied state, item icons and safe accessible item names", t => {
  const f = fixture(t);
  const bard = f.existing;
  const complete = { isUpgraded: true, socket: bard.socket, utility: bard.utility };
  f.modifiers.set(bard.instrument, []);
  Object.assign(bard, { isUpgraded: false, socket: undefined, utility: null });
  f.ctx.ready();
  const upgrade = rosterButton(f, "Upgrade");
  for (const label of ["Upgrade", "Socket", "Utility"]) {
    const button = rosterButton(f, label);
    assert(button.className.includes("btn-outline-success"));
    assert.equal(button.type, "button");
    assert.equal(button.disabled, false);
    assert.equal(button.children.length, 0);
    assert.equal(button.attributes["aria-label"], `${label} for Harp bard in slot 2`);
  }
  Object.assign(bard, complete);
  f.refresh();
  const upgraded = rosterButton(f, "Upgraded");
  assert(upgraded.className.includes("btn-success"));
  assert.equal(upgraded.disabled, true);
  upgraded.onclick();
  upgrade.onclick();
  assert.equal(f.nativeModalCalls.length, 0, "both current and stale Upgrade handlers recheck the applied state");
  for (const [label, item] of [["Socket", complete.socket], ["Utility", complete.utility]]) {
    const button = rosterButton(f, `${label}:`);
    assert(button.className.includes("btn-success"));
    assert.equal(button.disabled, false, "filled equipment slots remain changeable");
    assert.equal(button.title, `${label}: ${item.name}`);
    assert.equal(button.attributes["aria-label"], `${label}: ${item.name} for Harp bard in slot 2`);
    assert.equal(button.children[0].tag, "img");
    assert.equal(button.children[0].src, item.media);
    assert.equal(button.children[0].alt, "");
    button.onclick();
    const selector = `.myth-music-equipment .manage > .${label.toLowerCase()} > button`;
    assert.equal(f.didOpen(selector).clicks, 1);
  }
  assert(descendants(rosterCard(f)).every(node => !node.innerHTML.includes(complete.utility.name)));
  assert.equal(rosterIndicators(f).length, 0, "only the persistent header and native Mastery buttons retain gold notes");
});

test("stale roster handlers recheck bard presence, mastery level and a raced purchase", t => {
  const f = fixture(t);
  const bonus = { level: 40, isActive: false, isUpgrade: false, description: "Tier 40" };
  f.existing.isUpgraded = false;
  f.modifiers.set(f.existing.instrument, [bonus]);
  f.masteryLevels.set(f.existing.instrument, 40);
  f.ctx.ready();
  const buttons = ["Upgrade", "Socket:", "Utility:", "Mastery 40"].map(label => rosterButton(f, label));
  const mastery = buttons.at(-1);
  const fire = f.swal.fire;
  f.bards.delete(4);
  for (const button of buttons) button.onclick();
  assert.equal(f.nativeModalCalls.length, 0, "removed bards cannot open any native submenu");
  f.bards.set(4, f.existing);
  f.masteryLevels.set(f.existing.instrument, 39);
  mastery.onclick();
  assert.equal(f.nativeModalCalls.length, 0, "a saved level rollback invalidates an earlier eligible button");
  f.masteryLevels.set(f.existing.instrument, 40);
  f.modifiers.set(f.existing.instrument, []);
  mastery.onclick();
  assert.equal(f.nativeModalCalls.length, 0, "a removed modifier cannot select another native row");
  f.modifiers.set(f.existing.instrument, [bonus]);
  bonus.isActive = true;
  mastery.onclick();
  assert.equal(f.nativeModalCalls.length, 0, "a tier purchased since rendering cannot open a menu or spend again");
  assert.equal(f.swal.fire, fire);
});

test("roster mastery confirmation closes only after a native purchase or cancellation", t => {
  const f = fixture(t);
  const bonus = { level: 40, isActive: false, isUpgrade: false, description: "Tier 40" };
  f.modifiers.set(f.existing.instrument, [bonus]);
  f.masteryLevels.set(f.existing.instrument, 40);
  f.ctx.ready();
  const open = () => {
    f.swal.closed = false;
    rosterButton(f, "Mastery 40").onclick();
    f.didOpen(".myth-music-mastery .manage > .manage-section:nth-child(1) > button");
    const popup = f.swal.popup;
    return (button, currentTarget = popup) => popup.listeners.get("click")({
      currentTarget,
      composedPath() {
        return button ? [button, {
          matches(selector) { assert.equal(selector, ".unlock .myth-footer-buttons"); return true; },
        }, popup] : [popup];
      },
    });
  };
  const confirm = { tagName: "BUTTON", classList: { contains: () => false } };
  const cancel = { tagName: "BUTTON", classList: { contains: name => name === "btn-danger" } };
  let click = open();
  click(null);
  assert.equal(f.swal.closed, false, "ordinary popup clicks leave the confirmation open");
  click(confirm);
  assert.equal(f.swal.closed, false, "a failed or pending purchase must not dismiss the confirmation");
  bonus.isActive = true;
  click(confirm, {});
  assert.equal(f.swal.closed, false, "an old popup must not close a different current modal");
  click(confirm);
  assert.equal(f.swal.closed, true, "successful native unlocking closes instead of displaying the overview");
  bonus.isActive = false;
  f.refresh();
  click = open();
  click(cancel);
  assert.equal(f.swal.closed, true, "Back closes instead of displaying the overview");
  assert.equal(bonus.isActive, false, "cancellation must not apply the bonus");
});

test("the temporary native modal wrapper restores fire when opening or fire itself throws", t => {
  const f = fixture(t);
  const bonus = { level: 40, isActive: false, isUpgrade: false, description: "Tier 40" };
  f.modifiers.set(f.existing.instrument, [bonus]);
  f.masteryLevels.set(f.existing.instrument, 40);
  f.ctx.ready();
  const fire = f.swal.fire;
  const equipment = f.bridge.equipment;
  const failure = new Error("native modal failed");
  const failOpening = function () { assert.notEqual(f.swal.fire, fire); throw failure; };
  f.bridge.equipment = failOpening;
  assert.throws(() => rosterButton(f, "Socket:").onclick(), error => error === failure);
  assert.equal(f.swal.fire, fire);
  f.music.unlockMastery = failOpening;
  assert.throws(() => rosterButton(f, "Mastery 40").onclick(), error => error === failure);
  assert.equal(f.swal.fire, fire);
  f.bridge.equipment = equipment;
  const throwingFire = f.swal.fire = function () { assert.equal(this, f.swal); throw failure; };
  assert.throws(() => rosterButton(f, "Utility:").onclick(), error => error === failure);
  assert.equal(f.swal.fire, throwingFire, "restore the exact native implementation that was wrapped");
});

test("a native modal without the selected submenu button safely keeps its mounted overview", t => {
  const f = fixture(t);
  f.ctx.ready();
  const fire = f.swal.fire;
  rosterButton(f, "Socket:").onclick();
  const selector = ".myth-music-equipment .manage > .socket > button";
  assert.deepEqual(f.didOpen(selector, { missingButton: true }), { queries: [selector], clicks: 0 });
  assert.equal(f.nativeOpens.at(-1).target, f.existing);
  assert.equal(f.swal.fire, fire);
});

test("the persistent header cue follows hired mastery eligibility without resetting the collapsed state", t => {
  const f = fixture(t);
  const bonus = { level: 40, isActive: false, isUpgrade: false, description: "Tier 40" };
  f.modifiers.set(f.existing.instrument, [bonus]);
  f.masteryLevels.set(f.existing.instrument, 39);
  f.ctx.ready();
  const nodes = descendants(f.native.sibling);
  const toggle = nodes.find(node => node.attributes["aria-controls"] === "bardic-troupe-slots");
  const body = nodes.find(node => node.className === "block-content block-content-full");
  const marker = indicators(toggle)[0];
  assert.equal(marker.id, "bardic-troupe-attention");
  assert.equal(marker.textContent, "♫");
  assert.equal(marker.attributes.role, "img");
  assert.equal(marker.attributes["aria-label"], "A hired bard has a mastery bonus available or a missing instrument enhancement (costs still apply).");
  assert.equal(marker.title, marker.attributes["aria-label"]);
  assert.equal(toggle.children[0].children.at(-1), marker, "place the header cue after the hired count");
  assert.equal(toggle.children[0].children.at(-2).textContent, "1/2 hired");
  assert.equal(marker.hidden, true);
  assert.equal(toggle.attributes["aria-describedby"], "");
  assert.equal(body.hidden, true);
  f.masteryLevels.set(f.existing.instrument, 40);
  f.refresh();
  assert.equal(marker.hidden, false);
  assert.equal(toggle.attributes["aria-describedby"], marker.id);
  assert.equal(toggle.attributes["aria-label"], "Show bard slots");
  assert.equal(body.hidden, true, "the visible cue must not expand the roster");
  marker.click();
  assert.equal(body.hidden, false, "clicking the cue bubbles to the header exactly once");
  assert.equal(toggle.attributes["aria-label"], "Hide bard slots");
  f.refresh();
  assert.deepEqual(indicators(toggle), [marker], "keep the header cue mounted across renders");
  assert.equal(body.hidden, false);
  bonus.isActive = true;
  f.refresh();
  assert.equal(marker.hidden, true, "purchasing the last eligible bonus clears the cue");
  assert.equal(toggle.attributes["aria-describedby"], "");
  assert.equal(body.hidden, false);
  bonus.isActive = false;
  f.refresh();
  marker.click();
  f.refresh();
  assert.equal(marker.hidden, false);
  assert.equal(body.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
  assert.equal(toggle.attributes["aria-label"], "Show bard slots");
});

test("the header cue covers each missing enhancement on any hired bard", t => {
  const f = fixture(t);
  const complete = { isUpgraded: true, socket: f.existing.socket, utility: f.existing.utility };
  const firstBard = { instrument: f.instrument, slot: 1, ...complete };
  f.bards.set(1, firstBard);
  f.ctx.ready();
  const toggle = descendants(f.native.sibling).find(node => node.attributes["aria-controls"] === "bardic-troupe-slots");
  const marker = indicators(toggle)[0];
  assert.equal(marker.hidden, true);
  for (const missing of [{ isUpgraded: false }, { socket: undefined }, { utility: null }]) {
    Object.assign(f.existing, complete, missing);
    f.refresh();
    assert.equal(marker.hidden, false, "a later hired bard needs attention even when the first is complete");
    Object.assign(f.existing, complete);
    f.refresh();
    assert.equal(marker.hidden, true);
  }
  firstBard.isUpgraded = false;
  f.refresh();
  assert.equal(marker.hidden, false, "attention also includes the first hired bard");
  firstBard.isUpgraded = true;
  f.refresh();
  assert.equal(marker.hidden, true);
});

test("unhired eligibility and an empty roster do not trigger the hired-bard header cue", t => {
  const f = fixture(t);
  f.modifiers.set(f.instrument, [{ level: 40, isActive: false, isUpgrade: false, description: "Unhired tier" }]);
  f.masteryLevels.set(f.instrument, 40);
  f.ctx.ready();
  const toggle = descendants(f.native.sibling).find(node => node.attributes["aria-controls"] === "bardic-troupe-slots");
  const marker = indicators(toggle)[0];
  assert.equal(indicators(f.instrumentButtons.get(f.instrument).mastery)[0].hidden, false);
  assert.equal(marker.hidden, true, "native Mastery notifications for unhired instruments are separate");
  f.existing.isUpgraded = false;
  f.refresh();
  assert.equal(marker.hidden, false);
  f.bards.clear();
  f.refresh();
  assert.equal(marker.hidden, true, "the former bard's incomplete equipment must not count after removal");
  assert.equal(toggle.attributes["aria-describedby"], "");
  assert.equal(toggle.children[0].children.at(-2).textContent, "0/2 hired");
});

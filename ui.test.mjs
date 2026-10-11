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
  click() { this.onclick?.(); this.parent?.click(); }
  querySelectorAll(selector) {
    assert.equal(selector, "button");
    return descendants(this).slice(1).filter(node => node.tag === "button");
  }
}

function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}

function indicators(node) {
  return descendants(node).filter(child => child.className?.split(" ").includes("bardic-troupe-upgrade-indicator"));
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
    fire(options) { this.options = options; },
    close() { this.closed = true; }
  };
  const instrument = { name: "<img onerror=alert(1)>", media: "instrument.svg", id: "music:lute" };
  const existing = {
    instrument: { name: "Harp", media: "harp.svg", id: "music:harp" },
    slot: 4,
    isUpgraded: true,
    socket: { name: "Polished Ruby Gem" },
    utility: { name: "<Pristine Leather>" }
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
  let modalBard;
  const bridge = {
    setBard(bard) { this.bard = bard; },
    equipment() { this.didOpen = () => { modalBard = this.bard; }; }
  };
  class Music {}
  const music = Object.assign(new Music(), {
    bards: { get: slot => bards.get(slot), isHired: () => false },
    userInterface: { bard1: bridge, instruments },
    manager: { getModifiers: target => modifiers.get(target) ?? [] },
    getMasteryLevel: target => masteryLevels.get(target) ?? 1,
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
  return { native, swal, instrument, existing, bridge, music, troupe, patches, ctx, modifiers, masteryLevels, instrumentButtons, nativeMasteryCalls, refresh, modalBard: () => modalBard };
}

test("roster retains native controls and uses the native equipment modal for extra slots", t => {
  const f = fixture(t);
  f.patches.get("renderBardModifiers")();
  assert.equal(f.music.renderQueue.bardModifiers, true, "do not consume rendering before mounting");
  f.ctx.ready();
  assert.equal(f.native.hidden, true);
  assert.equal(f.native.children.length, 1, "retain controls needed by Music's decoder");
  const cards = descendants(f.native.sibling).find(node => node.id === "bardic-troupe-slots").children;
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map(card => card.children[0].children[0].textContent), ["Slot 1", "Slot 2"]);
  const nodes = descendants(cards[1]);
  assert(nodes.some(node => node.textContent === "Upgraded"));
  assert(nodes.some(node => node.textContent === "Socket: Polished Ruby Gem"));
  assert(nodes.some(node => node.textContent === "Utility: <Pristine Leather>"));
  assert(nodes.every(node => !node.innerHTML.includes("<Pristine Leather>")));
  const manage = nodes.find(node => node.tag === "button");
  assert.equal(manage.attributes["aria-label"], "Manage Harp bard in slot 2");
  manage.onclick();
  f.patches.get("renderBardModifiers")();
  assert.equal(f.music.renderQueue.bardModifiers, false);
  f.bridge.didOpen();
  assert.equal(f.modalBard(), f.existing, "roster renders must retain the extra bard until native didOpen");
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

test("mastery indicators start at the exact level and precede only eligible unpurchased bonus rows", t => {
  const f = fixture(t);
  const instrument = f.existing.instrument;
  f.modifiers.set(instrument, [
    { level: 40, isActive: false, isUpgrade: false, description: "Available at 40" },
    { level: 40, isActive: true, isUpgrade: false, description: "Already purchased" },
    { level: 75, isActive: false, isUpgrade: false, description: "Future tier" },
    { level: 40, isActive: false, isUpgrade: true, description: "Instrument upgrade" },
    { level: 999, isActive: false, isUpgrade: true, description: "Essence enhancement" },
  ]);
  f.masteryLevels.set(instrument, 39);
  f.ctx.ready();
  const buttonMarker = indicators(f.instrumentButtons.get(instrument).mastery)[0];
  assert.equal(buttonMarker.hidden, true);
  assert.equal(indicators(f.native.sibling).length, 0);
  f.masteryLevels.set(instrument, 40);
  f.refresh();
  const rowMarkers = indicators(f.native.sibling);
  assert.equal(rowMarkers.length, 1);
  const marker = rowMarkers[0];
  assert.equal(marker.parent.children[0], marker, "put the marker before the mastery-level label");
  assert.equal(marker.parent.children.at(-1).innerHTML, "Available at 40");
  assert.equal(marker.textContent, "♫");
  assert.equal(marker.attributes.role, "img");
  assert.equal(marker.attributes["aria-label"], "Mastery bonus available to unlock (costs still apply).");
  assert.equal(marker.title, marker.attributes["aria-label"]);
  assert.equal(buttonMarker.hidden, false);
  assert.equal(f.troupe.request, undefined, "indicators must not hire or purchase anything");
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
  assert.equal(indicators(f.native.sibling).length, 2);
  bonuses[0].isActive = true;
  f.refresh();
  assert.equal(marker.hidden, false, "the second eligible tier still needs attention");
  assert.equal(indicators(f.native.sibling).length, 1);
  bonuses[1].isActive = true;
  f.refresh();
  assert.equal(marker.hidden, true);
  assert.equal(indicators(f.native.sibling).length, 0);
  bonuses[0].isActive = false;
  f.masteryLevels.set(instrument, 39);
  f.refresh();
  assert.equal(marker.hidden, true);
  assert.equal(indicators(f.native.sibling).length, 0);
  f.masteryLevels.set(instrument, 40);
  f.refresh();
  assert.equal(marker.hidden, false);
  assert.equal(indicators(f.native.sibling).length, 1);
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
  assert.equal(indicators(f.native.sibling).length, 0, "an unhired instrument has no roster row");
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

test("Instrument markers reflect each missing enhancement independently of mastery bonuses and retain native management", t => {
  const f = fixture(t);
  const bard = f.existing;
  const complete = { isUpgraded: true, socket: bard.socket, utility: bard.utility };
  const manage = () => descendants(f.native.sibling).find(node => node.tag === "button" && node.attributes["aria-label"]?.startsWith("Manage Harp bard in slot 2"));
  f.modifiers.set(bard.instrument, []);
  bard.isUpgraded = false;
  f.ctx.ready();
  assert.equal(indicators(manage()).length, 1, "a missing enhancement is indicated on the first render");
  for (const missing of [
    { isUpgraded: false },
    { socket: undefined },
    { utility: null },
    { isUpgraded: false, socket: undefined, utility: undefined },
  ]) {
    Object.assign(bard, complete, missing);
    f.refresh();
    const button = manage();
    const markers = indicators(button);
    assert.equal(markers.length, 1, "one marker covers any combination of missing enhancements");
    const marker = markers[0];
    assert.equal(button.children[0], marker, "place the indicator at the beginning of the Instrument button");
    assert.equal(marker.textContent, "♫");
    assert.equal(marker.attributes.role, "img");
    assert.equal(marker.attributes["aria-label"], "Instrument enhancements available (upgrade, gem socket, or utility missing; costs still apply).");
    assert.equal(marker.title, marker.attributes["aria-label"]);
    assert.equal(button.attributes["aria-label"], `Manage Harp bard in slot 2. ${marker.attributes["aria-label"]}`);
    marker.click();
    f.bridge.didOpen();
    assert.equal(f.modalBard(), bard, "the marker still opens Music's management modal for this bard");
    assert.equal(indicators(f.native.sibling).length, 1, "no mastery bonus is needed for the equipment marker");
    Object.assign(bard, complete);
    f.refresh();
    assert.equal(indicators(manage()).length, 0, "completing every enhancement clears the marker after refresh");
    assert.equal(manage().attributes["aria-label"], "Manage Harp bard in slot 2");
  }
  f.modifiers.set(bard.instrument, [{ level: 40, isActive: false, isUpgrade: false, description: "Mastery tier" }]);
  f.masteryLevels.set(bard.instrument, 40);
  f.refresh();
  assert.equal(indicators(f.native.sibling).length, 1, "an eligible mastery tier retains its own row marker");
  assert.equal(indicators(manage()).length, 0, "mastery eligibility does not mark a fully enhanced Instrument button");
});

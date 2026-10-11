import assert from "node:assert/strict";
import test from "node:test";
import { installControls } from "./ui.mjs";

class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.innerHTML = ""; }
  append(...nodes) { for (const node of nodes) node.parent = this; this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
  after(node) { this.sibling = node; }
  click() { this.onclick?.(); this.parent?.click(); }
}

function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}

function fixture(t) {
  const originals = { document: globalThis.document, SwalLocale: globalThis.SwalLocale };
  t.after(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const native = new Node("div");
  native.append(new Node("native-bard-component"));
  globalThis.document = { createElement: tag => new Node(tag), getElementById: () => native };
  const swal = globalThis.SwalLocale = {
    closed: false,
    fire(options) { this.options = options; },
    close() { this.closed = true; }
  };
  const instrument = { name: "<img onerror=alert(1)>", media: "instrument.svg", id: "music:lute" };
  const existing = {
    instrument: { name: "Harp", media: "harp.svg" },
    slot: 4,
    isUpgraded: true,
    socket: { name: "Polished Ruby Gem" },
    utility: { name: "<Pristine Leather>" }
  };
  const bards = new Map([[4, existing]]);
  let modalBard;
  const bridge = {
    setBard(bard) { this.bard = bard; },
    equipment() { this.didOpen = () => { modalBard = this.bard; }; }
  };
  class Music {}
  const music = Object.assign(new Music(), {
    bards: { get: slot => bards.get(slot), isHired: () => false },
    userInterface: { bard1: bridge },
    manager: { getModifiers: () => [{ description: "<b>Native modifier</b>", isActive: true }] },
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
  return { native, swal, instrument, existing, bridge, music, troupe, patches, ctx, modalBard: () => modalBard };
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

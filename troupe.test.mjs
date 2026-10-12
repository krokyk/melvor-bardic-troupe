import assert from "node:assert/strict";
import test from "node:test";
import { createShopData, namespace, slotPrice, Troupe } from "./troupe.mjs";

function fixture({ count = 8, bought = 0, band = false, relic = false, gp = 1_000_000_000 } = {}) {
  const instruments = Array.from({ length: count }, (_, index) => ({ id: `mythMusic:Instrument_${index + 1}`, level: index + 1 }));
  const actions = new Map(instruments.map(instrument => [instrument.id, instrument]));
  const items = new Map(["Polished_Ruby_Gem", "Mystic_Oil"].map(id => [`mythMusic:${id}`, { id: `mythMusic:${id}` }]));
  const purchases = Array.from({ length: Math.max(0, count - 1) }, (_, index) => ({ id: `${namespace}:Slot_${index + 1}` }));
  const purchaseCounts = new Map(purchases.slice(0, bought).map(purchase => [purchase, 1]));
  const music = {
    id: "mythMusic:Music",
    media: "music.svg",
    isUnlocked: true,
    actions: { allObjects: instruments, getObjectByID: id => actions.get(id) },
    isMasteryActionUnlocked: instrument => instrument.level <= music.level,
    level: count,
    game: {
      shop: { getPurchaseCount: purchase => purchaseCounts.get(purchase) ?? 0 },
      items: { getObjectByID: id => items.get(id) },
      gp: {
        amount: gp,
        canAfford(cost) { return this.amount >= cost; },
        remove(cost) { this.amount -= cost; },
      },
    },
    manager: {
      isBandPracticeUnlocked: band,
      isMasterAncientRelicUnlocked: relic,
      costs: [10_000, 100_000, 1_000_000, 10_000_000],
      unlocked: 2,
      hireModifier: -25,
      calculateHireCost() { return { costs: this.costs, unlocked: this.unlocked }; },
      getHireCostModifier() { return this.hireModifier; },
    },
    renderQueue: {},
    statsCalls: 0,
    computeProvidedStats() { this.statsCalls++; },
    userInterface: {
      instruments: new Map(instruments.map(instrument => [instrument, {
        updates: 0,
        updateDisabled() { this.updates++; },
      }])),
    },
  };
  // Match Music's instrument-keyed Map and numeric slot lookup.
  music.bards = {
    bards: new Map(),
    get(instrumentOrSlot) {
      return typeof instrumentOrSlot === "number"
        ? this.all().find(bard => bard.slot === instrumentOrSlot)
        : this.bards.get(actions.get(instrumentOrSlot.id));
    },
    set(instrument, bard) { this.bards.set(actions.get(instrument.id), bard); },
    remove(instrument) { this.bards.delete(actions.get(instrument.id)); },
    all() { return [...this.bards.values()]; },
    isHired(instrument) { return this.bards.has(actions.get(instrument.id)); },
  };
  return { music, troupe: new Troupe(music, purchases), instruments, items, purchases, purchaseCounts };
}

function addBard(music, instrument, slot, equipment = {}) {
  const bard = { instrument, slot, isUpgraded: false, socket: undefined, utility: undefined, ...equipment };
  music.bards.set(instrument, bard);
  return bard;
}

function record(bard) {
  return {
    instrument: bard.instrument.id,
    slot: bard.slot,
    isUpgraded: bard.isUpgraded,
    socket: bard.socket?.id,
    utility: bard.utility?.id,
  };
}

function state(music) {
  return {
    gp: music.game.gp.amount,
    bards: music.bards.all().map(record),
    statsCalls: music.statsCalls,
    renderQueue: { ...music.renderQueue },
    updates: [...music.userInterface.instruments.values()].map(component => component.updates),
  };
}

test("shop tiers default to 1B and Music level 100 with the preceding purchase required", () => {
  const { music } = fixture({ count: 15 });
  const data = createShopData(music);
  const purchases = data.data.shopPurchases;
  assert.equal(slotPrice, 1_000_000_000);
  assert.equal(data.namespace, namespace);
  assert.equal(purchases.length, 14);
  assert.equal(purchases[0].customName, "Bardic Troupe I");
  assert.equal(purchases[3].customName, "Bardic Troupe IV");
  assert.equal(purchases[8].customName, "Bardic Troupe IX");
  assert.equal(purchases[13].customName, "Bardic Troupe XIV");
  for (const [index, purchase] of purchases.entries()) {
    const previous = index ? [{ type: "ShopPurchase", purchaseID: `${namespace}:Slot_${index}`, count: 1 }] : [];
    assert.deepEqual(purchase.cost.currencies, [{ currency: "melvorD:GP", type: "Fixed", cost: 1_000_000_000 }]);
    assert.deepEqual(purchase.unlockRequirements, previous);
    assert.deepEqual(purchase.purchaseRequirements, [{ type: "SkillLevel", skillID: music.id, level: 100 }, ...previous]);
    assert.equal(purchase.defaultBuyLimit, 1);
    assert.equal(purchase.allowQuantityPurchase, false);
  }
  assert.deepEqual(data.data.shopDisplayOrder[0].ids, purchases.map(purchase => `${namespace}:${purchase.id}`));
});

test("registered instruments determine shop tiers and the capacity limit", () => {
  for (const count of [0, 1, 10, 14, 15, 16, 17]) {
    const { music } = fixture({ count });
    assert.equal(createShopData(music).data.shopPurchases.length, Math.max(0, count - 1));
  }
  const { music, troupe, purchases, purchaseCounts } = fixture({ count: 4, bought: 1, relic: true });
  assert.equal(troupe.canBuySlot(), true);
  purchaseCounts.set(purchases[1], 1);
  assert.equal(troupe.canBuySlot(), false);
  music.actions.allObjects.push({ id: "mythMusic:Additional_Instrument", level: 5 });
  assert.equal(troupe.canBuySlot(), true);
});

test("native slot ownership preserves gaps and Troupe slots always start at four", () => {
  for (const [band, relic, native] of [[false, false, [1]], [true, false, [1, 2]], [false, true, [1, 3]], [true, true, [1, 2, 3]]]) {
    const { troupe } = fixture({ band, relic, bought: 2 });
    assert.deepEqual(troupe.nativeSlots(), native);
    assert.deepEqual(troupe.purchasedSlots(), [4, 5]);
    assert.deepEqual(troupe.slots(), [...native, 4, 5]);
  }
});

test("an out-of-order purchase does not grant a slot until all preceding tiers are owned", () => {
  const { troupe, purchases, purchaseCounts } = fixture();
  purchaseCounts.set(purchases[1], 1);
  assert.deepEqual(troupe.purchasedSlots(), []);
  purchaseCounts.set(purchases[0], 1);
  assert.deepEqual(troupe.purchasedSlots(), [4, 5]);
  purchaseCounts.set(purchases[3], 1);
  assert.deepEqual(troupe.purchasedSlots(), [4, 5]);
});

test("hiring charges the normal adjusted cost, replaces one bard and resets enhancements", () => {
  const { music, troupe, instruments, items } = fixture({ bought: 1 });
  const native = addBard(music, instruments[0], 1);
  const old = addBard(music, instruments[1], 4, {
    isUpgraded: true,
    socket: items.get("mythMusic:Polished_Ruby_Gem"),
    utility: items.get("mythMusic:Mystic_Oil"),
  });
  const gp = music.game.gp.amount;
  assert.equal(troupe.hireCost(instruments[2]), 75_000);
  assert.equal(troupe.hire(instruments[2], 4), true);
  assert.equal(music.game.gp.amount, gp - 75_000);
  assert.equal(music.bards.get(1), native);
  assert.equal(music.bards.isHired(old.instrument), false);
  assert.deepEqual(music.bards.get(4), {
    instrument: instruments[2], slot: 4, isUpgraded: false, socket: undefined, utility: undefined,
  });
  assert.equal(music.statsCalls, 1);
  assert.deepEqual(music.renderQueue, { bardModifiers: true, grants: true, gpRange: true });
  assert.ok([...music.userInterface.instruments.values()].every(component => component.updates === 1));
});

test("invalid hiring requests leave money, bards, modifiers and rendering untouched", async t => {
  const cases = [
    ["locked skill", ({ music }) => { music.isUnlocked = false; }],
    ["locked instrument", ({ music }) => { music.level = 1; }],
    ["unpaid Troupe slot", () => {}, 5],
    ["unowned Band Practice slot", () => {}, 2],
    ["unowned master relic slot", () => {}, 3],
    ["fractional slot", () => {}, 4.5],
    ["insufficient GP", ({ music }) => { music.game.gp.amount = 74_999; }],
    ["duplicate instrument", ({ music, instruments }) => { addBard(music, instruments[2], 1); }],
    ["instrument object with an existing ID", () => {}, 4, { id: "mythMusic:Instrument_3" }],
    ["unknown instrument", () => {}, 4, { id: "unknown:Instrument" }],
    ["missing instrument", () => {}, 4, null],
  ];
  for (const [name, arrange, slot = 4, requested] of cases) {
    await t.test(name, () => {
      const f = fixture({ bought: 1 });
      addBard(f.music, f.instruments[1], 4, { isUpgraded: true });
      arrange(f);
      const before = state(f.music);
      assert.equal(f.troupe.hire(requested === undefined ? f.instruments[2] : requested, slot), false);
      assert.deepEqual(state(f.music), before);
    });
  }
});

test("non-finite, negative, absent and unsafe hire prices cannot mutate the character", async t => {
  for (const cost of [NaN, Infinity, -Infinity, -1, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    await t.test(String(cost), () => {
      const { music, troupe, instruments } = fixture({ bought: 1 });
      music.manager.costs = [cost];
      music.manager.unlocked = 1;
      music.manager.hireModifier = 0;
      const before = state(music);
      assert.equal(troupe.hireCost(instruments[0]), undefined);
      assert.equal(troupe.hire(instruments[0], 4), false);
      assert.deepEqual(state(music), before);
    });
  }
});

test("extra bards round-trip through JSON with equipment IDs and native bards unchanged", () => {
  const { music, troupe, instruments, items } = fixture({ bought: 2 });
  const native = addBard(music, instruments[0], 1, { isUpgraded: true });
  const extra = addBard(music, instruments[1], 4, {
    isUpgraded: true,
    socket: items.get("mythMusic:Polished_Ruby_Gem"),
    utility: items.get("mythMusic:Mystic_Oil"),
  });
  const second = addBard(music, instruments[2], 5);
  const saved = JSON.parse(JSON.stringify(troupe.save()));
  assert.deepEqual(saved, { version: 1, bards: [
    { instrument: instruments[1].id, slot: 4, isUpgraded: true, socket: extra.socket.id, utility: extra.utility.id },
    { instrument: instruments[2].id, slot: 5, isUpgraded: false },
  ] });
  music.bards.remove(extra.instrument);
  music.bards.remove(second.instrument);
  troupe.restore(saved);
  assert.equal(music.bards.get(1), native);
  assert.deepEqual(music.bards.get(4), extra);
  assert.equal(music.bards.get(4).socket, items.get(extra.socket.id));
  assert.equal(music.bards.get(4).utility, items.get(extra.utility.id));
  assert.deepEqual(music.bards.get(5), second);
  troupe.restore(saved);
  assert.equal(music.bards.all().length, 3);
});

test("restore ignores missing instruments, unpaid slots and duplicate instrument or slot records", () => {
  const { music, troupe, instruments } = fixture({ bought: 2 });
  const native = addBard(music, instruments[0], 1);
  addBard(music, instruments[6], 5);
  troupe.restore({ version: 1, bards: [
    null, {}, { instrument: instruments[1].id, slot: 4.5 },
    { instrument: "missing:Instrument", slot: 4 },
    { instrument: instruments[0].id, slot: 4 },
    { instrument: instruments[1].id, slot: 6 },
    { instrument: instruments[1].id, slot: 4, isUpgraded: "true", socket: "missing:Gem", utility: "missing:Oil" },
    { instrument: instruments[2].id, slot: 4 },
    { instrument: instruments[1].id, slot: 5 },
    { instrument: instruments[3].id, slot: 5 },
  ] });
  assert.equal(music.bards.get(1), native);
  assert.deepEqual(music.bards.all().map(bard => [bard.instrument.id, bard.slot]), [
    [instruments[0].id, 1], [instruments[1].id, 4], [instruments[3].id, 5],
  ]);
  assert.equal(music.bards.get(4).isUpgraded, false);
  assert.equal(music.bards.get(4).socket, undefined);
  assert.equal(music.bards.get(4).utility, undefined);
});

test("absent or unsupported saved payloads clear stale extras while retaining native bards", () => {
  for (const saved of [undefined, null, {}, { version: 2, bards: [] }, { version: 1, bards: "invalid" }]) {
    const { music, troupe, instruments } = fixture({ bought: 1 });
    const native = addBard(music, instruments[0], 1);
    addBard(music, instruments[1], 4);
    troupe.restore(saved);
    assert.deepEqual(music.bards.all(), [native]);
  }
});

test("Music encoding retains only authorized native bards when Troupe is disabled", () => {
  for (const [band, relic, expectedSlots] of [[false, false, [1]], [true, false, [1, 2]], [false, true, [1, 3]], [true, true, [1, 2, 3]]]) {
    const { music, troupe, instruments } = fixture({ bought: 2, band, relic });
    for (const slot of [1, 2, 3, 4, 5]) addBard(music, instruments[slot - 1], slot, { isUpgraded: true });
    const originalMap = music.bards.bards;
    const liveBards = music.bards.all();
    const writer = { records: [] };
    const returned = troupe.encodeNative((received, marker) => {
      assert.equal(received, writer);
      assert.equal(marker, "save");
      assert.notEqual(music.bards.bards, originalMap);
      writer.records = music.bards.all().map(record);
      return writer;
    }, writer, "save");
    assert.equal(returned, writer);
    assert.deepEqual(writer.records.map(bard => bard.slot), expectedSlots);
    assert.equal(music.bards.bards, originalMap);
    assert.deepEqual(music.bards.all(), liveBards);
    // Native Music can decode these records without knowing Troupe exists.
    const withoutAddon = fixture({ band, relic });
    for (const saved of writer.records) {
      const instrument = withoutAddon.music.actions.getObjectByID(saved.instrument);
      addBard(withoutAddon.music, instrument, saved.slot, { isUpgraded: saved.isUpgraded });
    }
    assert.deepEqual(withoutAddon.music.bards.all().map(bard => bard.slot), expectedSlots);
  }
});

test("failed native encoding restores the same live Map and every bard reference", () => {
  const { music, troupe, instruments } = fixture({ bought: 1 });
  addBard(music, instruments[0], 1);
  addBard(music, instruments[1], 4);
  const originalMap = music.bards.bards;
  const liveBards = music.bards.all();
  const error = new Error("writer failed");
  assert.throws(() => troupe.encodeNative(() => {
    music.bards.bards.clear();
    throw error;
  }), thrown => thrown === error);
  assert.equal(music.bards.bards, originalMap);
  assert.deepEqual(music.bards.all(), liveBards);
  assert.ok(music.bards.all().every((bard, index) => bard === liveBards[index]));
});

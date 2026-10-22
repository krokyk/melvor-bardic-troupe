import assert from "node:assert/strict";
import test from "node:test";
import { installSkillBonuses } from "./bonuses.mjs";

const names = ["Guitar", "Drum", "Banjo", "Accordion", "Bouzouki", "Flute", "Maraca", "Xylophone", "Saxophone", "Violin", "Bongo", "French_Horn", "Harp", "Tambourine", "Trumpet", "Cello"];
const expected = [
  ["Guitar", 1, "D"], ["Drum", 1, "P"], ["Drum", 40, "D"], ["Banjo", 1, "D"], ["Banjo", 40, "P"],
  ["Accordion", 1, "P"], ["Bouzouki", 20, "D"], ["Bouzouki", 65, "P"], ["Flute", 65, "P"],
  ["Maraca", 20, "D"], ["Maraca", 999, "P"], ["Xylophone", 20, "P"], ["Saxophone", 65, "D"],
  ["Violin", 20, "P"], ["Violin", 65, "D"], ["Bongo", 999, "D"], ["French_Horn", 40, "P"],
  ["Harp", 40, "D"], ["Tambourine", 999, "D"], ["Trumpet", 999, "P"],
];

async function fixture({ missing = [] } = {}) {
  const fields = new Map();
  let scopeRegistered = false;
  let refreshes = 0;
  const instruments = new Map(names.filter(name => !missing.includes(name)).map(name => {
    const modes = Object.fromEntries(["standard", "hardcore"].map(mode => [mode, [1, 20, 40, 65, 999].map(level => ({
      level,
      modifiers: name === "Trumpet" && level === 999 ? undefined : [{ modifier: { id: "native:bonus" }, value: mode === "standard" ? 10 : 2 }],
      describePlain() { return (this.modifiers ?? []).map(value => `${value.modifier.id}:${value.value}`).join(", "); },
    }))]));
    return [`mythMusic:${name}`, { id: `mythMusic:${name}`, modifiers: mode => modes[mode] }];
  }));
  const music = {
    actions: { getObjectByID: id => instruments.get(id) },
    game: { getModifierValuesFromData(data) {
      assert(scopeRegistered, "the modifier scope must be registered before parsing additions");
      return Object.entries(data).map(([id, value]) => ({ modifier: { id: `melvorD:${id}` }, value }));
    } },
  };
  const section = {
    add(config) { fields.set(config.name, { config, value: config.default }); },
    get(name) { return fields.get(name).value; },
    set(name, value) {
      const field = fields.get(name);
      const result = field.config.onChange(value, field.value);
      if (typeof result === "string") return result;
      field.value = value;
    },
  };
  const controller = await installSkillBonuses({
    gameData: { async addPackage(data) {
      assert.equal(data.data, undefined, "scope registration must be its own package");
      assert.equal(data.modifications.modifiers[0].id, "melvorD:skillItemDoublingChance");
      assert.deepEqual(data.modifications.modifiers[0].allowedScopes[0].scopes, {});
      scopeRegistered = true;
    } },
    settings: { section(name) { assert.equal(name, "Bardic Troupe"); return section; } },
  }, music, { refresh() { refreshes++; } });
  const name = "extra-preservation-and-doubling";
  function additions(mode) {
    return [...instruments.values()].flatMap(instrument => instrument.modifiers(mode).flatMap(stats =>
      (stats.modifiers ?? []).filter(value => value.modifier.id.startsWith("melvorD:")).map(value => [instrument.id.split(":")[1], stats.level, value.modifier.id === "melvorD:skillItemDoublingChance" ? "D" : "P", value.value])));
  }
  return { instruments, fields, controller, section, name, additions, toggle: value => section.set(name, value), refreshes: () => refreshes };
}

test("the default-OFF per-character switch leaves all native values and descriptions untouched", async () => {
  const f = await fixture();
  const field = f.fields.get(f.name);
  assert.equal(field.config.type, "switch");
  assert.equal(field.config.label, "Extra preservation and doubling");
  assert.equal(field.value, false);
  assert.match(field.config.hint, /Chance to Double Items in Skills/);
  assert.match(field.config.hint, /Chance to Preserve Resources in Skills/);
  for (const mode of ["standard", "hardcore"]) assert.deepEqual(f.additions(mode), []);
  f.controller.applySaved();
  assert.equal(f.refreshes(), 0);
});

test("both modes receive the exact agreed 20 separate five-point awards across 15 instruments", async () => {
  const f = await fixture();
  f.toggle(true);
  assert.equal(f.refreshes(), 1, "the same toggle call refreshes the game immediately");
  for (const mode of ["standard", "hardcore"]) {
    const actual = f.additions(mode);
    assert.deepEqual(actual.map(value => value.slice(0, 3)), expected);
    assert(actual.every(value => value[3] === 5));
    assert.equal(new Set(actual.map(([instrument]) => instrument)).size, 15);
    assert.equal(new Set(actual.map(([instrument, tier]) => `${instrument}:${tier}`)).size, 20, "no tier receives both additions");
    assert.equal(actual.filter(value => value[2] === "D").reduce((sum, value) => sum + value[3], 0), 50);
    assert.equal(actual.filter(value => value[2] === "P").reduce((sum, value) => sum + value[3], 0), 50);
    for (const tier of [1, 20, 40, 65, 999]) assert.equal(actual.filter(value => value[1] === tier).length, 4);
    assert(!actual.some(([instrument]) => instrument === "Cello"));
  }
});

test("repeated toggles hide additions completely without duplicates or deleting another mod's changes", async () => {
  const f = await fixture();
  const guitar = f.instruments.get("mythMusic:Guitar").modifiers("standard")[0];
  const native = guitar.modifiers[0];
  const trumpetUpgrade = f.instruments.get("mythMusic:Trumpet").modifiers("standard")[4];
  f.toggle(true);
  const other = { modifier: { id: "other:bonus" }, value: 7 };
  guitar.modifiers.push(other);
  f.toggle(true);
  assert.equal(f.additions("standard").length, 20);
  f.toggle(false);
  assert.deepEqual(guitar.modifiers, [native, other]);
  assert.equal(guitar.describePlain(), "native:bonus:10, other:bonus:7");
  assert.equal(trumpetUpgrade.modifiers, undefined);
  assert.deepEqual(f.additions("standard"), []);
  f.toggle(true);
  assert.equal(f.additions("standard").length, 20);
  f.toggle(false);
  assert.deepEqual(guitar.modifiers, [native, other]);
});

test("absent expansion shares are skipped without increasing another instrument's share", async () => {
  const f = await fixture({ missing: ["Flute", "French_Horn", "Harp", "Tambourine", "Trumpet"] });
  f.toggle(true);
  const actual = f.additions("standard");
  assert.equal(actual.length, 15);
  assert(actual.every(value => value[3] === 5));
  assert.equal(actual.filter(value => value[2] === "D").reduce((sum, value) => sum + value[3], 0), 40);
  assert.equal(actual.filter(value => value[2] === "P").reduce((sum, value) => sum + value[3], 0), 35);
});

test("restoring and switching character settings never carries an enabled value into a missing older setting", async () => {
  const first = await fixture();
  const second = await fixture();
  first.toggle(true);
  assert.equal(second.section.get(second.name), false);
  assert.deepEqual(second.additions("standard"), []);
  first.controller.resetForLoad();
  first.controller.applySaved();
  assert.equal(first.section.get(first.name), false);
  assert.deepEqual(first.additions("standard"), []);
  first.fields.get(first.name).value = true;
  first.controller.applySaved();
  assert.equal(first.additions("standard").length, 20);
  for (const invalid of [undefined, null, "true", 1, {}]) {
    first.fields.get(first.name).value = invalid;
    first.controller.applySaved();
    assert.equal(first.section.get(first.name), false);
    assert.deepEqual(first.additions("standard"), []);
  }
  assert.equal(typeof first.toggle("true"), "string");
});

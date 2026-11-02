export async function installAbyssalEquipment(ctx, music, namespace) {
  const game = music.game, abyssal = game.realms?.getObjectByID("melvorItA:Abyssal");
  if (!game.registeredNamespaces?.hasNamespace("melvorItA") || !abyssal || !game.abyssalPieces) return;
  const { abyssalEquipment, createAbyssalEquipmentData } = await ctx.loadModule("abyssal-equipment-data.mjs");
  await ctx.gameData.addPackage(createAbyssalEquipmentData(namespace));
  const equipment = abyssalEquipment.map(definition => {
    const item = game.items.getObjectByID(`${namespace}:${definition.id}`);
    if (!item) throw new Error(`Bardic Troupe could not find ${namespace}:${definition.id}.`);
    const stats = Object.keys(definition.modifiers).length ? new StatObject({ modifiers: definition.modifiers }, game, definition.name) : undefined;
    if (stats) stats.modifiers = game.getModifierValuesFromData(definition.modifiers);
    return { ...definition, item, stats };
  });
  const validBard = bard => bard && bard.instrument.realm === abyssal && abyssal.isUnlocked && music.isUnlocked &&
    music.actions.getObjectByID(bard.instrument.id) === bard.instrument && music.isMasteryActionUnlocked(bard.instrument);
  const hired = () => music.bards.all().filter(validBard);
  const attachment = (bard, state) => equipment.find(entry => entry.state === state && entry.item === bard[state]);

  ctx.patch(music.constructor, "addProvidedStats").after(function () {
    if (this !== music) return;
    for (const bard of hired()) {
      for (const state of ["socket", "utility"]) {
        const entry = attachment(bard, state);
        if (entry?.stats) this.providedStats.addStatObject(bard.instrument, entry.stats);
      }
    }
  });
  ctx.patch(music.constructor, "actionRewards").get(function (original) {
    const rewards = original(), instrument = this.activeInstrument;
    if (this !== music || instrument?.realm !== abyssal || !abyssal.isUnlocked) return rewards;
    for (const bard of hired()) {
      const entry = attachment(bard, "utility");
      if (entry?.id === "Abyssal_String" && rollPercentage(5)) rewards.addItemByID("mythMusic:Sheet_Music", 1);
      if (entry?.id !== "Abyssal_Oil") continue;
      // Extra reward rolls exclude mastery XP, action rewards, and event rewards.
      this.rollForRareDrops(instrument.abyssalLevel, rewards, instrument);
      this.rollForMasteryTokens(rewards, instrument.realm);
      this.rollForAncientRelics(instrument.abyssalLevel, instrument.realm);
      this.rollForPets(this.currentActionInterval, instrument);
      game.summoning.rollMarksForSkill(this, this.masteryModifiedInterval, instrument.realm);
    }
    return rewards;
  });

  function refresh() {
    music.computeProvidedStats(true);
    music.renderQueue.bardModifiers = true;
    music.renderQueue.grants = true;
    music.renderQueue.gpRange = true;
    for (const component of music.userInterface.instruments.values()) component.updateDisabled();
  }

  function open(slot, state, onChange = refresh) {
    const bard = music.bards.get(slot), instrument = bard?.instrument;
    if (!validBard(bard) || !["upgrade", "socket", "utility"].includes(state) || state === "upgrade" && bard.isUpgraded) return;
    const items = () => Object.fromEntries(equipment.map(entry => [entry.type, {
      item: entry.item, quantity: game.bank.getQty(entry.item), descriptions: [entry.description],
    }]));
    const apply = (type, target, component) => {
      const entry = equipment.find(entry => entry.type === type && entry.state === target);
      if (!entry || music.bards.get(slot) !== bard || bard.instrument !== instrument || !validBard(bard) ||
          game.items.getObjectByID(entry.item.id) !== entry.item || game.bank.getQty(entry.item) < 1 ||
          (target === "upgrade" ? bard.isUpgraded : bard[target] === entry.item)) {
        SwalLocale.showValidationMessage("Could not apply this item. Check the hired bard, instrument unlocks, and available materials.");
        return false;
      }
      game.bank.removeItemQuantityByID(entry.item.id, 1, true);
      if (target === "upgrade") bard.isUpgraded = true;
      else bard[target] = entry.item;
      music.bards.set(instrument, bard);
      onChange();
      component.setState("manage");
      return true;
    };
    const component = {
      $template: "#myth-music-equipment", bard, state, items: items(),
      get upgradeModifier() { return music.manager.getModifiers(instrument).find(modifier => modifier.isUpgrade); },
      ok() { SwalLocale.clickConfirm(); },
      setState(next) { SwalLocale.resetValidationMessage(); this.items = items(); this.state = next; },
      upgrade() { return apply("Essence_Of_Music", "upgrade", this); },
      socket(type) { return apply(type, "socket", this); },
      utility(type) { return apply(type, "utility", this); },
      isSocket(type) { return equipment.find(entry => entry.type === type)?.item === bard.socket; },
      isUtility(type) { return equipment.find(entry => entry.type === type)?.item === bard.utility; },
      getModifier(type) { return equipment.filter(entry => entry.type === type || entry.item.localID === type).map(entry => entry.description); },
    };
    const content = document.createElement("div");
    content.id = "myth-music-equipment-container";
    return SwalLocale.fire({
      html: content, showConfirmButton: false, showCancelButton: false, showDenyButton: false,
      didOpen() { ui.create(component, content); },
    });
  }

  return {
    open,
    restoreItem(instrument, item, state) {
      if (instrument?.realm !== abyssal || !item) return item;
      return equipment.find(entry => entry.state === state &&
        (entry.item.id === item.id || `mythMusic:${entry.type}` === item.id))?.item;
    },
  };
}

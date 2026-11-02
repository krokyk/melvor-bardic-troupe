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
    const content = document.createElement("div");
    content.className = "text-left";
    const status = document.createElement("p");
    status.className = "text-danger font-size-sm";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    for (const entry of equipment.filter(entry => entry.state === state)) {
      const row = document.createElement("div");
      row.className = "border-bottom py-3";
      const image = document.createElement("img");
      image.className = "skill-icon-sm mr-2";
      image.src = entry.item.media;
      image.alt = "";
      const name = document.createElement("span");
      name.className = "font-w600";
      name.textContent = entry.item.name;
      const description = document.createElement("p");
      description.className = "font-size-sm my-2";
      description.textContent = state === "upgrade" ? music.manager.getModifiers(instrument).find(modifier => modifier.isUpgrade)?.description ?? entry.description : entry.description;
      const quantity = document.createElement("p");
      quantity.className = "font-size-sm";
      quantity.textContent = `Requires 1. You have ${game.bank.getQty(entry.item).toLocaleString("en-US")}.`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-success btn-sm";
      button.textContent = state === "upgrade" ? "Upgrade" : state === "socket" ? "Socket" : "Apply";
      button.setAttribute("aria-label", `${button.textContent} ${entry.item.name} for ${instrument.name}`);
      button.disabled = game.bank.getQty(entry.item) < 1 || state !== "upgrade" && bard[state] === entry.item;
      button.onclick = () => {
        if (music.bards.get(slot) !== bard || bard.instrument !== instrument || !validBard(bard) ||
            game.items.getObjectByID(entry.item.id) !== entry.item || game.bank.getQty(entry.item) < 1 ||
            (state === "upgrade" ? bard.isUpgraded : bard[state] === entry.item)) {
          status.textContent = "Could not apply this item. Check the hired bard, instrument unlocks, and available materials.";
          return;
        }
        game.bank.removeItemQuantityByID(entry.item.id, 1, true);
        if (state === "upgrade") bard.isUpgraded = true;
        else bard[state] = entry.item;
        music.bards.set(instrument, bard);
        onChange();
        SwalLocale.close();
      };
      row.append(image, name, description, quantity, button);
      content.append(row);
    }
    content.append(status);
    return SwalLocale.fire({
      titleText: `${instrument.name}: ${state === "upgrade" ? "Upgrade" : state === "socket" ? "Socket" : "Utility"}`,
      html: content, showConfirmButton: false, showCancelButton: true, cancelButtonText: "Back",
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

export async function installAbyssalMusic(ctx, music, namespace) {
  const game = music.game, abyssal = game.realms?.getObjectByID("melvorItA:Abyssal");
  if (!game.registeredNamespaces?.hasNamespace("melvorItA") || !abyssal || !game.abyssalPieces) return;
  const { createAbyssalData } = await ctx.loadModule("abyssal-data.mjs");
  const data = createAbyssalData(namespace);
  const capIncreases = [
    ["melvorItA:TheAbyss", "randomIncreases", { skillID: music.id, increase: 15, maximum: 60 }],
    ["melvorItA:FinalDepthSetAbyssal60", "setIncreases", { skillID: music.id, value: 60 }],
  ].flatMap(([id, key, increase]) => {
    const record = game.skillLevelCapIncreases?.getObjectByID(id);
    return record && !record[key].some(entry => entry.skill === music) ? [{ id, [key]: { add: [increase] } }] : [];
  });
  if (capIncreases.length) data.modifications = { ...data.modifications, skillLevelCapIncreases: capIncreases };
  await ctx.gameData.addPackage(data);
  const instruments = data.data.skillData[0].data.instruments.map(definition => {
    loadedLangJson[`Myth_Music_Instrument_${definition.id}`] = definition.name;
    return music.actions.getObjectByID(`${namespace}:${definition.id}`);
  });
  const realm = abyssal.id;
  const skillID = music.id;
  // The hire discount resolves instrument IDs, so register checkpoints after the instruments.
  await ctx.gameData.addPackage({
    namespace,
    data: { skillData: [{ skillID, data: { masteryPoolBonuses: [
      { realm, percent: 10, modifiers: { abyssalSkillXP: [{ skillID, value: 3 }] } },
      { realm, percent: 25, modifiers: { masteryXP: [{ skillID, realmID: realm, value: 3 }] } },
      { realm, percent: 50, modifiers: { flatSkillInterval: [{ skillID, realmID: realm, value: -250 }] } },
      { realm, percent: 95, modifiers: {
        "mythMusic:musicHireCost": instruments.map(instrument => ({ skillID, actionID: instrument.id, value: -5 })),
      } },
    ] } }] },
  });
  if (typeof MasteryPoolBonusElement === "function") {
    ctx.patch(MasteryPoolBonusElement, "setBonus").replace(function (original, bonus, skill) {
      if (skill !== music || bonus.realm !== abyssal || bonus.percent !== 95) return original(bonus, skill);
      let shownHireDiscount = false;
      // The renderer repeats the same description for each instrument's discount.
      const modifiers = bonus.modifiers.filter(({ modifier, value }) => {
        if (modifier.id !== "mythMusic:musicHireCost" || value !== -5) return true;
        if (shownHireDiscount) return false;
        shownHireDiscount = true;
        return true;
      });
      return original({ ...bonus, modifiers }, skill);
    });
  }
  const isAbyssal = instrument => instrument?.realm === abyssal;

  ctx.patch(music.constructor, "isMasteryActionUnlocked").replace(function (original, instrument) {
    return (this !== music || !isAbyssal(instrument) || abyssal.isUnlocked) && original(instrument);
  });
  ctx.patch(music.manager.constructor, "getModifiersForApplication").replace(function (original, instrument) {
    if (this === music.manager && isAbyssal(instrument) && !music.isMasteryActionUnlocked(instrument)) return [];
    return original(instrument);
  });
  ctx.patch(music.constructor, "train").replace(function (original, instrument) {
    if (this === music) {
      if (!this.isUnlocked || !this.isMasteryActionUnlocked(instrument)) return;
      if (this.currentRealm !== instrument.realm) this.selectRealm(instrument.realm);
    }
    return original(instrument);
  });
  ctx.patch(music.constructor, "actionRewards").get(function (original) {
    const rewards = original(), instrument = this.activeInstrument;
    if (this !== music || !isAbyssal(instrument)) return rewards;
    // Music's native reward getter awards only ordinary XP, including Concert Pass XP.
    rewards._xp.delete(music);
    rewards.addAbyssalXP(music, instrument.baseAbyssalExperience, instrument);
    for (const skill of [...rewards._xp.keys()]) {
      if (!instrument.skills.includes(skill.id)) continue;
      rewards._xp.delete(skill);
      if (!skill.hasAbyssalLevels) continue;
      const level = Math.min(skill.abyssalLevel, 60);
      const xp = Math.max((abyssalExp.levelToXP(level + 1) - abyssalExp.levelToXP(level)) / 1000, 1);
      rewards.addAbyssalXP(skill, xp, instrument);
    }
    return rewards;
  });

  const queueRealm = () => {
    music.renderQueue.visibleInstruments = true;
    music.renderQueue.grants = true;
    music.renderQueue.bardModifiers = true;
  };
  ctx.patch(music.constructor, "onRealmChange").after(function () { if (this === music) queueRealm(); });
  ctx.patch(music.constructor, "onAbyssalLevelUp").after(function () {
    if (this !== music) return;
    queueRealm();
    music.computeProvidedStats(true);
  });
  ctx.patch(music.constructor, "decode").after(function () {
    if (this !== music) return;
    const instrument = this.activeInstrument;
    if (isAbyssal(instrument) && !this.isMasteryActionUnlocked(instrument)) {
      if (this.isActive) this.stop();
      this.activeInstrument = undefined;
    }
    queueRealm();
  });
  ctx.patch(music.constructor, "postDataRegistration").after(function () {
    if (this !== music) return;
    // Music puts every instrument in ordinary milestones, regardless of its realm.
    this.milestones = this.milestones.filter(instrument => !isAbyssal(instrument));
    for (const instrument of instruments) if (!this.abyssalMilestones.includes(instrument)) this.abyssalMilestones.push(instrument);
    this.sortMilestones();
  });
  ctx.patch(music.constructor, "renderVisibleInstruments").replace(function (original, ...args) {
    if (this !== music) return original(...args);
    if (!this.renderQueue.visibleInstruments || typeof document === "undefined") return;
    if (game.openPage?.action !== music || game.enableRendering === false || game._isInOnlineLoop === false || document.visibilityState === "hidden") return;
    for (const [instrument, component] of this.userInterface.instruments) {
      const card = document.getElementById(component.localId);
      if (!card) continue;
      const visible = instrument.realm === music.currentRealm && this.isMasteryActionUnlocked(instrument);
      if (visible) showElement(card); else hideElement(card);
    }
    this.userInterface.locked.update();
    this.renderQueue.visibleInstruments = false;
  });
  ctx.patch(music.constructor, "renderGrants").replace(function (original, ...args) {
    const refresh = this === music && this.renderQueue.grants;
    const result = original(...args);
    if (!refresh) return result;
    for (const instrument of instruments) {
      const component = this.userInterface.instruments.get(instrument);
      if (!component?.xpIcon) continue;
      component.xpIcon.setXP(this.modifyAbyssalXP(instrument.baseAbyssalExperience, instrument), instrument.baseAbyssalExperience);
      component.xpIcon.setSources(this.getAbyssalXPSources(instrument));
      component.masteryPoolIcon.setRealm(abyssal);
    }
    return result;
  });

  ctx.onInterfaceReady(() => {
    for (const instrument of instruments) {
      const component = music.userInterface.instruments.get(instrument);
      if (!component?.xpIcon || typeof document === "undefined") continue;
      const icon = document.createElement("abyssal-xp-icon");
      icon.id = component.xpIcon.id;
      component.xpIcon.replaceWith(icon);
      component.xpIcon = icon;
    }
    const locked = music.userInterface.locked;
    locked.getNextUnlock = () => music.actions.find(instrument => instrument.realm === music.currentRealm && !music.isMasteryActionUnlocked(instrument));
    locked.update = function () {
      const next = this.getNextUnlock();
      this.isVisible = !!next;
      this.level = next ? isAbyssal(next) ? `${next.abyssalLevel} (Abyssal)` : next.level : 1;
    };
    queueRealm();
  });
  return { instruments, realm: abyssal };
}

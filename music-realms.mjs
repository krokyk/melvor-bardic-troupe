export function installMusicRealms(ctx, music) {
  const game = music.game;
  const abyssal = game.realms?.getObjectByID("melvorItA:Abyssal"), ap = game.abyssalPieces;
  if (!game.registeredNamespaces?.hasNamespace("melvorItA") || !abyssal || !ap) return;
  const currency = () => abyssal.isUnlocked && music.currentRealm === abyssal ? ap : game.gp;
  const rows = new Map();
  const renderRanges = () => {
    if (typeof document === "undefined") return;
    const selected = currency(), code = selected === ap ? "AP" : "GP";
    for (const [instrument, component] of music.userInterface.instruments) {
      const card = document.getElementById(component.localId);
      if (!card) continue;
      let view = rows.get(instrument);
      if (view?.card !== card || !card.contains(view.row)) {
        const icon = card.querySelector('small > img[src$="/coins.svg"]');
        if (!icon) continue;
        const row = icon.parentElement, label = document.createTextNode("");
        // Music's native currency suffix is fixed text; its range calculations remain native.
        row.replaceChildren(icon, label);
        view = { card, row, icon, label }; rows.set(instrument, view);
      }
      const text = `${numberWithCommas(component.minGP)}-${numberWithCommas(component.maxGP)} ${code}`;
      if (view.icon.getAttribute("src") !== selected.media) view.icon.src = selected.media;
      if (view.icon.alt !== selected.name) view.icon.alt = selected.name;
      if (view.label.textContent !== text) view.label.textContent = text;
      const description = `${selected.name}: ${text}`;
      if (view.row.getAttribute("aria-label") !== description) view.row.setAttribute("aria-label", description);
    }
  };
  ctx.patch(music.constructor, "actionRewards").get(function (original) {
    const rewards = original();
    if (this === music && currency() === ap) {
      // Native Rewards exposes no currency-removal method.
      const amount = rewards._currencies.get(game.gp);
      if (amount !== undefined) { rewards._currencies.delete(game.gp); rewards.addCurrency(ap, amount); }
    }
    return rewards;
  });
  ctx.patch(music.constructor, "getRealmOptions").replace(function (original, ...args) {
    const options = original(...args);
    return this === music && abyssal.isUnlocked && !options.includes(abyssal) ? [...options, abyssal] : options;
  });
  ctx.patch(music.constructor, "onRealmChange").after(function () {
    if (this !== music) return;
    this.renderQueue.gpRange = true;
    game.renderQueue.sidebarSkillOpacity = true;
  });
  ctx.patch(music.constructor, "renderGPRange").replace(function (original, ...args) {
    if (this === music && (game.openPage?.action !== music || game.enableRendering === false || game._isInOnlineLoop === false ||
      typeof document !== "undefined" && document.visibilityState === "hidden")) return;
    const refresh = this === music && this.renderQueue.gpRange;
    const result = original(...args);
    if (refresh) renderRanges();
    return result;
  });
  game.renderQueue.sidebarSkillOpacity = true;
  ctx.onInterfaceReady(() => { music.renderQueue.gpRange = true; music.renderGPRange(); });
}

export async function setup(ctx) {
  const [{ Troupe, createShopData, namespace }, { installControls }, { configureUpgrades }, { installCello }] = await Promise.all([
    ctx.loadModule("troupe.mjs"),
    ctx.loadModule("ui.mjs"),
    ctx.loadModule("config.mjs"),
    ctx.loadModule("cello.mjs"),
  ]);
  ctx.onModsLoaded(async () => {
    const music = game.music;
    if (!music || music.id !== "mythMusic:Music" || music.version !== 4 ||
        !music.bards?.bards || !music.userInterface) {
      throw new Error("Bardic Troupe requires [Myth] Music (mod.io ID 3096259), with Music save format 4. Enable Music and reload Melvor.");
    }
    let storageReady = false;
    const cello = await installCello(ctx, music, () => storageReady);
    const data = createShopData(music);
    await ctx.gameData.addPackage(data);
    const purchases = data.data.shopPurchases.map(purchase => game.shop.purchases.getObjectByID(`${namespace}:${purchase.id}`));
    const settings = configureUpgrades(ctx, game, purchases);
    const troupe = new Troupe(music, purchases);
    const bandPractice = game.shop.purchases.getObjectByID("mythMusic:Band_Practice");
    const bandIndex = game.shop.purchaseDisplayOrder.indexOf(bandPractice);
    if (bandIndex !== -1) game.shop.purchaseDisplayOrder.splice(bandIndex, 1);
    const isBlocked = purchase => purchase === bandPractice || (purchases.includes(purchase) && !troupe.canBuySlot());
    ctx.patch(ShopTabMenu, "shouldShowItem").after(function (result, purchase) {
      if (isBlocked(purchase)) return 0;
    });
    ctx.patch(Shop, "buyItemOnClick").replace(function (original, purchase, confirmed) {
      if (isBlocked(purchase)) return;
      return original(purchase, confirmed);
    });
    game.shop.on("purchaseMade", ({ purchase }) => {
      if (!purchases.includes(purchase)) return;
      troupe.refresh();
      game.shop.renderQueue.requirements = true;
      if (typeof shopMenu !== "undefined") shopMenu.tabs.get(purchase.category)?.menu.updateItemSelection();
    });
    // shortcut: unlinked Creator Toolkit builds may lose characterStorage; link a mod.io listing for saved rosters.
    const restore = () => {
      settings.applySaved();
      const saved = ctx.characterStorage.getItem("troupe");
      troupe.restore(saved);
      cello?.restorePrayers(saved?.version === 1 ? saved.celloPrayers : undefined);
    };
    ctx.onCharacterLoaded(() => {
      storageReady = true;
      restore();
    });
    ctx.patch(game.constructor, "encode").before(function () {
      if (storageReady) {
        const saved = troupe.save();
        if (cello) saved.celloPrayers = cello.savePrayers();
        ctx.characterStorage.setItem("troupe", saved);
      }
    });
    ctx.patch(music.constructor, "encode").replace(function (original, ...args) {
      return troupe.encodeNative(original, ...args);
    });
    ctx.patch(game.constructor, "decode").before(function () {
      // QuickLoad must not reuse storage left over from a newer save with Troupe enabled.
      if (storageReady) ctx.characterStorage.removeItem("troupe");
    });
    ctx.patch(game.constructor, "decode").after(function () {
      if (storageReady) restore();
    });
    installControls(ctx, music, troupe);
  });
}

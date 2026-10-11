export async function setup(ctx) {
  const [{ Troupe, createShopData, namespace }, { installControls }, { configureUpgrades }] = await Promise.all([
    ctx.loadModule("troupe.mjs"),
    ctx.loadModule("ui.mjs"),
    ctx.loadModule("config.mjs"),
  ]);
  ctx.onModsLoaded(async () => {
    const music = game.music;
    if (!music || music.id !== "mythMusic:Music" || music.version !== 4 ||
        !music.bards?.bards || !music.userInterface) {
      throw new Error("Bardic Troupe requires [Myth] Music (mod.io ID 3096259), with Music save format 4. Enable Music and reload Melvor.");
    }
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
    let storageReady = false;
    ctx.onCharacterLoaded(() => {
      storageReady = true;
      settings.applySaved();
      troupe.restore(ctx.characterStorage.getItem("troupe"));
    });
    ctx.patch(game.constructor, "encode").before(function () {
      if (storageReady) ctx.characterStorage.setItem("troupe", troupe.save());
    });
    ctx.patch(music.constructor, "encode").replace(function (original, ...args) {
      return troupe.encodeNative(original, ...args);
    });
    ctx.patch(game.constructor, "decode").before(function () {
      // QuickLoad must not reuse storage left over from a newer save with Troupe enabled.
      if (storageReady) ctx.characterStorage.removeItem("troupe");
    });
    ctx.patch(game.constructor, "decode").after(function () {
      if (storageReady) {
        settings.applySaved();
        troupe.restore(ctx.characterStorage.getItem("troupe"));
      }
    });
    installControls(ctx, music, troupe);
  });
}

const realm = "melvorItA:Abyssal", music = "mythMusic:Music";
const materials = id => [
  { id: `melvorItA:${id}`, quantity: 100 },
  { id: "melvorItA:Nightopal", quantity: 10 },
  { id: "melvorItA:Abyssal_Stardust", quantity: 50 },
];

export const abyssalEquipment = [
  {
    id: "Abyssal_Essence_Of_Music", name: "Abyssal Essence of Music", state: "upgrade", type: "Essence_Of_Music",
    media: "assets/abyssal/essence-of-music.png",
    description: "Used for Abyssal instrument upgrades and paid Abyssal mastery rewards.",
    modifiers: {}, apCost: 1_000_000,
    items: [{ id: "melvorItA:Abyssal_Essence", quantity: 1000 }, { id: "melvorItA:Weak_Soul", quantity: 50 }],
  },
  {
    id: "Polished_Nightopal_Gem", name: "Polished Nightopal Gem", state: "socket", type: "Polished_Topaz_Gem",
    media: "assets/abyssal/polished-nightopal.png",
    description: "Can be socketed into hired Abyssal bard instruments. Grants +5% Abyssal Music AP.",
    modifiers: { currencyGain: [{ currencyID: "melvorItA:AbyssalPieces", skillID: music, value: 5 }] }, apCost: 50_000,
    items: [{ id: "melvorItA:Nightopal", quantity: 50 }, { id: "melvorItA:Abyssal_Stardust", quantity: 10 }],
  },
  {
    id: "Polished_Shadowpearl_Gem", name: "Polished Shadowpearl Gem", state: "socket", type: "Polished_Ruby_Gem",
    media: "assets/abyssal/polished-shadowpearl.png",
    description: "Can be socketed into hired Abyssal bard instruments. Grants +5% Music Abyssal XP.",
    modifiers: { abyssalSkillXP: [{ skillID: music, value: 5 }] }, apCost: 50_000,
    items: [{ id: "melvorItA:Shadowpearl", quantity: 50 }, { id: "melvorItA:Abyssal_Stardust", quantity: 10 }],
  },
  {
    id: "Polished_Moonstone_Gem", name: "Polished Moonstone Gem", state: "socket", type: "Polished_Sapphire_Gem",
    media: "assets/abyssal/polished-moonstone.png",
    description: "Can be socketed into hired Abyssal bard instruments. Grants +5% Abyssal Music Mastery XP.",
    modifiers: { masteryXP: [{ skillID: music, realmID: realm, value: 5 }] }, apCost: 50_000,
    items: [{ id: "melvorItA:Moonstone", quantity: 50 }, { id: "melvorItA:Abyssal_Stardust", quantity: 10 }],
  },
  {
    id: "Abyssal_String", name: "Abyssal String", state: "utility", type: "Diamond_String",
    media: "assets/abyssal/string.png",
    description: "Can be applied to hired Abyssal bard instruments. Grants +5% chance to gain an additional Sheet Music while training Abyssal Music.",
    modifiers: {}, apCost: 50_000, items: materials("Twisted_Tendril"),
  },
  {
    id: "Pristine_Abyssal_Leather", name: "Pristine Abyssal Leather", state: "utility", type: "Pristine_Leather",
    media: "assets/abyssal/leather.png",
    description: "Can be applied to hired Abyssal bard instruments. Grants -5% Abyssal Music Interval.",
    modifiers: { skillInterval: [{ skillID: music, realmID: realm, value: -5 }] }, apCost: 50_000,
    items: materials("Abyssal_Leather"),
  },
  {
    id: "Abyssal_Oil", name: "Abyssal Oil", state: "utility", type: "Mystic_Oil",
    media: "assets/abyssal/oil.png",
    description: "Can be applied to hired Abyssal bard instruments. Rolls an additional time for rare drops, mastery tokens, ancient relics, pets, and Summoning marks while training Abyssal Music.",
    modifiers: {}, apCost: 50_000, items: materials("Abyssal_Firemaking_Oil"),
  },
];

export function createAbyssalEquipmentData(namespace) {
  const purchases = abyssalEquipment.map(item => ({
    id: `Equipment_${item.id}`, category: `${namespace}:AbyssalMusicEquipment`, media: item.media,
    contains: { items: [{ id: `${namespace}:${item.id}`, quantity: 1 }] },
    cost: { items: item.items, currencies: [{ currency: "melvorItA:AbyssalPieces", type: "Fixed", cost: item.apCost }] },
    allowQuantityPurchase: true,
    unlockRequirements: [],
    purchaseRequirements: [
      { type: "DungeonCompletion", dungeonID: "melvorItA:Into_The_Abyss", count: 1 },
      { type: "AbyssalLevel", skillID: music, level: 1 },
    ],
    defaultBuyLimit: 0, buyLimitOverrides: [], showBuyLimit: false,
  }));
  return {
    namespace,
    data: {
      items: abyssalEquipment.map(item => ({
        itemType: "Item", id: item.id, name: item.name, category: "Music", type: "Misc", media: item.media,
        ignoreCompletion: true, obtainFromItemLog: false, golbinRaidExclusive: false,
        customDescription: item.description, sellsForCurrency: "melvorItA:AbyssalPieces", sellsFor: 500,
      })),
      shopCategories: [{ id: "AbyssalMusicEquipment", name: "Abyssal Music Equipment", media: "assets/abyssal/essence-of-music.png" }],
      shopCategoryOrder: [{ insertAt: "End", ids: [`${namespace}:AbyssalMusicEquipment`] }],
      shopPurchases: purchases,
      shopDisplayOrder: [{ insertAt: "End", ids: purchases.map(purchase => `${namespace}:${purchase.id}`) }],
    },
  };
}

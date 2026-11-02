export const namespace = "KrokyBardicTroupe";
export const slotPrice = 1_000_000_000;

export function isAbyssal(value) {
  return (value?.realm?.id ?? value?.id) === "melvorItA:Abyssal";
}

function roman(number) {
  let result = "";
  for (const [value, letters] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) {
    while (number >= value) { result += letters; number -= value; }
  }
  return result;
}

export function createShopData(music) {
  const purchases = Array.from({ length: Math.max(0, music.actions.allObjects.filter(instrument => !isAbyssal(instrument)).length - 1) }, (_, index) => {
    const previous = index === 0 ? [] : [{ type: "ShopPurchase", purchaseID: `${namespace}:Slot_${index}`, count: 1 }];
    return {
      id: `Slot_${index + 1}`,
      category: `${namespace}:Troupe`,
      media: "icon.svg",
      customName: `Bardic Troupe ${roman(index + 1)}`,
      customDescription: "Unlock one additional hired bard slot in Music. Normal bard hiring and instrument upgrade costs still apply.",
      contains: { items: [], modifiers: {} },
      cost: { items: [], currencies: [{ currency: "melvorD:GP", type: "Fixed", cost: slotPrice }] },
      allowQuantityPurchase: false,
      unlockRequirements: previous,
      purchaseRequirements: [{ type: "SkillLevel", skillID: music.id, level: 100 }, ...previous],
      defaultBuyLimit: 1,
      buyLimitOverrides: [],
      showBuyLimit: false,
    };
  });
  const abyssalCount = music.actions.allObjects.filter(isAbyssal).length;
  for (let index = 1; index < abyssalCount; index++) {
    const previous = index === 1 ? [] : [{ type: "ShopPurchase", purchaseID: `${namespace}:Abyssal_Slot_${index - 1}`, count: 1 }];
    purchases.push({
      id: `Abyssal_Slot_${index}`, category: `${namespace}:AbyssalTroupe`, media: "assets/abyssal/conductor.png",
      customName: `Abyssal Bardic Troupe ${roman(index)}`,
      customDescription: "Unlock one additional hired Abyssal bard slot in Music.",
      contains: { items: [], modifiers: {} },
      cost: { items: [], currencies: [{ currency: "melvorItA:AbyssalPieces", type: "Fixed", cost: 1_000_000 }] },
      allowQuantityPurchase: false, unlockRequirements: previous,
      purchaseRequirements: [{ type: "AbyssalLevel", skillID: music.id, level: 1 }, ...previous],
      defaultBuyLimit: 1, buyLimitOverrides: [], showBuyLimit: false,
    });
  }
  return {
    namespace,
    data: {
      shopCategories: [{ id: "Troupe", name: "Bardic Troupe", media: "icon.svg" },
        ...(abyssalCount ? [{ id: "AbyssalTroupe", name: "Abyssal Bardic Troupe", media: "assets/abyssal/conductor.png" }] : [])],
      shopCategoryOrder: [{ insertAt: "End", ids: [`${namespace}:Troupe`, ...(abyssalCount ? [`${namespace}:AbyssalTroupe`] : [])] }],
      shopPurchases: purchases,
      shopDisplayOrder: [{ insertAt: "End", ids: purchases.map(purchase => `${namespace}:${purchase.id}`) }],
    },
  };
}

export class Troupe {
  constructor(music, purchases) {
    this.music = music;
    this.purchases = purchases;
  }

  purchasedSlots(realm = undefined) {
    const slots = [];
    for (const purchase of this.purchases) {
      if (purchase.id.includes(":Abyssal_Slot_") !== isAbyssal(realm)) continue;
      if (this.music.game.shop.getPurchaseCount(purchase) < 1) break;
      // Slots 2 and 3 belong exclusively to Music's original upgrade and relic.
      slots.push(slots.length + (isAbyssal(realm) ? 1002 : 4));
    }
    return slots;
  }

  nativeSlots() {
    const slots = [1];
    if (this.music.manager.isBandPracticeUnlocked) slots.push(2);
    if (this.music.manager.isMasterAncientRelicUnlocked) slots.push(3);
    return slots;
  }

  slots(realm = this.music.currentRealm) {
    if (isAbyssal(realm)) {
      const abyssal = realm.realm ?? realm;
      if (!this.music.actions.allObjects.some(isAbyssal) || abyssal.isUnlocked !== true) return [];
      return [1001, ...this.purchasedSlots(abyssal)];
    }
    return [...this.nativeSlots(), ...this.purchasedSlots()];
  }

  canBuySlot(purchase) {
    const abyssal = purchase?.id.includes(":Abyssal_Slot_") === true;
    const realm = abyssal ? this.music.game.realms?.getObjectByID("melvorItA:Abyssal") : undefined;
    return this.slots(realm ?? { id: "melvorD:Melvor" }).length < this.music.actions.allObjects.filter(instrument => isAbyssal(instrument) === abyssal).length &&
      (!abyssal || realm?.isUnlocked === true);
  }

  hireCurrency(instrument) {
    return isAbyssal(instrument) ? this.music.game.abyssalPieces : this.music.game.gp;
  }

  hireCost(instrument) {
    if (!instrument || typeof instrument.id !== "string" || this.music.actions.getObjectByID(instrument.id) !== instrument ||
        !this.music.isUnlocked || !this.music.isMasteryActionUnlocked(instrument)) return;
    const { costs, unlocked } = this.music.manager.calculateHireCost(instrument);
    const cost = Math.floor(costs[Math.min(unlocked, costs.length) - 1] * (1 + this.music.manager.getHireCostModifier(instrument) / 100));
    if (Number.isSafeInteger(cost) && cost >= 0) return cost;
  }

  hire(instrument, slot) {
    const cost = this.hireCost(instrument);
    const currency = this.hireCurrency(instrument);
    if (cost === undefined || !this.slots(instrument).includes(slot) ||
        this.music.bards.isHired(instrument) || !currency?.canAfford(cost)) return false;
    const previous = this.music.bards.get(slot);
    currency.remove(cost);
    if (previous) this.music.bards.remove(previous.instrument);
    this.music.bards.set(instrument, { instrument, slot, isUpgraded: false, socket: undefined, utility: undefined });
    this.refresh();
    return true;
  }

  refresh() {
    this.music.computeProvidedStats(true);
    this.music.renderQueue.bardModifiers = true;
    this.music.renderQueue.grants = true;
    this.music.renderQueue.gpRange = true;
    for (const component of this.music.userInterface.instruments.values()) component.updateDisabled();
  }

  save() {
    return {
      version: 1,
      bards: this.music.bards.all().filter(bard => bard.slot >= 4).map(bard => ({
        instrument: bard.instrument.id,
        slot: bard.slot,
        isUpgraded: bard.isUpgraded,
        socket: bard.socket?.id,
        utility: bard.utility?.id,
      })),
    };
  }

  restore(saved) {
    for (const bard of this.music.bards.all()) {
      if (bard.slot >= 4) this.music.bards.remove(bard.instrument);
    }
    const abyssal = this.music.game.realms?.getObjectByID("melvorItA:Abyssal");
    const slots = new Set([...this.purchasedSlots(), ...(abyssal ? [1001, ...this.purchasedSlots(abyssal)] : [])]);
    if (saved?.version === 1 && Array.isArray(saved.bards)) {
      for (const record of saved.bards) {
        if (!record || typeof record.instrument !== "string" || !Number.isSafeInteger(record.slot) || !slots.has(record.slot)) continue;
        const instrument = this.music.actions.getObjectByID(record.instrument);
        if (!instrument || isAbyssal(instrument) !== (record.slot >= 1001) || this.music.bards.isHired(instrument)) continue;
        this.music.bards.set(instrument, {
          instrument,
          slot: record.slot,
          isUpgraded: record.isUpgraded === true,
          socket: typeof record.socket === "string" ? this.music.game.items.getObjectByID(record.socket) : undefined,
          utility: typeof record.utility === "string" ? this.music.game.items.getObjectByID(record.utility) : undefined,
        });
        slots.delete(record.slot);
      }
    }
    this.refresh();
  }

  encodeNative(original, ...args) {
    const bards = this.music.bards.bards;
    const slots = this.nativeSlots();
    // Never leak Troupe bards into Music's save: they would be invisible when this addon is disabled.
    this.music.bards.bards = new Map([...bards].filter(([, bard]) => slots.includes(bard.slot)));
    try {
      return original(...args);
    } finally {
      this.music.bards.bards = bards;
    }
  }
}

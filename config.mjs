export function configureUpgrades(ctx, game, purchases) {
  const requirements = new Map(purchases.map(purchase => [
    purchase, purchase.purchaseRequirements.find(requirement => requirement.type === "SkillLevel"),
  ]));
  const settings = ctx.settings.section("Bardic Troupe");
  const fields = [
    {
      name: "troupe-slot-price", label: "Price per slot (GP)", default: 500_000_000, min: 0,
      hint: "Whole number, including 0 for free. Changes do not refund existing purchases.",
      apply(value) {
        for (const purchase of purchases) {
          for (const cost of purchase.costs.currencies) if (cost.currency === game.gp) cost.cost = value;
        }
      },
    },
    {
      name: "troupe-slot-level", label: "Required Music level", default: 100, min: 1,
      hint: "Actual Music level, not virtual. Use 99 or less for a character capped at 99. Existing purchases stay unlocked.",
      apply(value) { for (const requirement of requirements.values()) requirement.level = value; },
    },
  ];
  for (const field of fields) {
    field.isValid = value => Number.isSafeInteger(value) && value >= field.min;
    settings.add({
      type: "number", name: field.name, label: field.label, hint: field.hint,
      default: field.default, min: field.min, max: Number.MAX_SAFE_INTEGER,
      onChange(value) {
        if (!field.isValid(value)) return `Enter a valid whole number of at least ${field.min}.`;
        field.apply(value);
        game.shop.renderQueue.costs = true;
        game.shop.renderQueue.requirements = true;
      },
    });
  }

  const renderedLevels = new WeakMap();
  ctx.patch(ShopCostsAndUnlock, "updatePurchaseRequirements").after(function () {
    const requirement = requirements.get(this.purchase);
    if (!requirement || renderedLevels.get(this) === requirement.level) return;
    // Native requirement refresh recolors cached labels without updating their level text.
    const index = this.purchase.purchaseRequirements.indexOf(requirement);
    this.requirementElements[index].cost.replaceChildren(...requirement.getNodes("skill-icon-xs m-1"));
    renderedLevels.set(this, requirement.level);
  });

  const applySaved = () => {
    for (const field of fields) {
      const saved = settings.get(field.name);
      // Melvor restores saved settings without running onChange validation.
      settings.set(field.name, field.isValid(saved) ? saved : field.default);
    }
  };
  return { applySaved };
}

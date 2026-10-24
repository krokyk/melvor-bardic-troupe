function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function bardName(instrument, suffix = "Bard") {
  return instrument.id === "KrokyBardicTroupe:Cello" ? instrument.name : `${instrument.name} ${suffix}`;
}

function canUnlockMastery(music, instrument, modifier) {
  return !modifier.isActive && !modifier.isUpgrade && modifier.level > 1 && modifier.level <= 99 &&
    music.getMasteryLevel(instrument) >= modifier.level;
}

function openMusicMenu(open, selector) {
  // Music keeps submenu state private, so enter it through the native modal's own button.
  const fire = SwalLocale.fire;
  SwalLocale.fire = function (options) {
    return fire.call(this, {
      ...options,
      didOpen(popup) {
        options.didOpen?.call(this, popup);
        const button = popup.querySelector(selector);
        if (button && !button.disabled) button.click();
      },
    });
  };
  try {
    return open();
  } finally {
    SwalLocale.fire = fire;
  }
}

function upgradeIndicator(description = "Mastery bonus available to unlock (costs still apply).") {
  const indicator = element("span", "bardic-troupe-upgrade-indicator text-warning mr-1", "♫");
  indicator.setAttribute("role", "img");
  indicator.setAttribute("aria-label", description);
  indicator.title = description;
  return indicator;
}

function appendModifiers(container, music, instrument, onMastery) {
  for (const modifier of music.manager.getModifiers(instrument)) {
    const row = element("div", modifier.isActive ? "text-success" : "myth-text-grey");
    if (onMastery && !modifier.isUpgrade && modifier.level > 1 && modifier.level <= 99) {
      const available = canUnlockMastery(music, instrument, modifier);
      const style = modifier.isActive ? "btn-success" : available ? "btn-outline-success" : "btn-outline-secondary";
      const button = element("button", `btn btn-sm ${style}`, `Mastery ${modifier.level}`);
      button.type = "button";
      button.disabled = !available;
      button.title = modifier.isActive ? "Mastery bonus unlocked." : available ? "Mastery bonus available to unlock (costs still apply)." : `Requires instrument mastery level ${modifier.level}.`;
      button.setAttribute("aria-label", `${instrument.name}: Mastery ${modifier.level}. ${button.title}`);
      button.onclick = () => onMastery(modifier.level);
      row.className += " bardic-troupe-mastery-row";
      row.append(button);
    } else {
      if (canUnlockMastery(music, instrument, modifier)) row.append(upgradeIndicator());
      if (modifier.isUpgrade) {
        row.append(element("span", "mr-1", "Upgrade: "));
      } else if (!modifier.isActive) {
        row.append(element("span", "mr-1", `(Mastery ${modifier.level}) `));
      }
    }
    const description = element("span", "");
    description.innerHTML = modifier.description;
    row.append(description);
    container.append(row);
  }
}

export function installControls(ctx, music, troupe, mastery) {
  let roster;
  let toggle;
  let rosterIndicator;
  let slotGrid;
  let slotCount;
  let body;
  const masteryIndicators = new Map();

  function openEquipment(slot, state) {
    const bard = music.bards.get(slot);
    if (!bard || (state === "upgrade" && bard.isUpgraded)) return;
    music.userInterface.bard1.setBard(bard);
    return openMusicMenu(() => music.userInterface.bard1.equipment(), `.myth-music-equipment .manage > .${state} > button`);
  }

  function openMastery(slot, level) {
    const bard = music.bards.get(slot);
    if (!bard) return;
    const modifier = music.manager.getModifiers(bard.instrument).find(modifier => modifier.level === level);
    if (!modifier) return;
    if (!canUnlockMastery(music, bard.instrument, modifier)) return;
    return mastery.open(bard.instrument, level);
  }

  ctx.patch(music.constructor, "unlockMastery").replace(function (_original, instrument) {
    const content = element("div", "text-left myth-music-mastery");
    appendModifiers(content, music, instrument, level => mastery.open(instrument, level));
    return SwalLocale.fire({ titleText: `${instrument.name}: Mastery`, html: content, confirmButtonText: "OK" });
  });

  function render() {
    if (!slotGrid || music.game.openPage?.action !== music) return;
    const slots = troupe.slots();
    let hired = 0;
    let needsAttention = false;
    if (!body.hidden) slotGrid.replaceChildren();
    for (const [index, slot] of slots.entries()) {
      const number = index + 1;
      const bard = music.bards.get(slot);
      if (bard) {
        hired++;
        needsAttention ||= !bard.isUpgraded || !bard.socket || !bard.utility ||
          music.manager.getModifiers(bard.instrument).some(modifier => canUnlockMastery(music, bard.instrument, modifier));
      }
      if (body.hidden) continue;
      const card = element("div", "block block-rounded border-top border-music border-4x p-3");
      const heading = element("div", "d-flex flex-wrap align-items-center mb-2");
      heading.append(element("span", "font-size-lg mr-2", `Slot ${number}`));
      if (bard) {
        const image = element("img", "instrument-icon mr-2");
        image.src = bard.instrument.media;
        image.alt = "";
        heading.append(image, element("span", "font-size-lg mr-2", bardName(bard.instrument)));
        card.append(heading);
        const enhancements = element("div", "d-flex flex-wrap mb-2");
        for (const [state, label, applied, item] of [
          ["upgrade", bard.isUpgraded ? "Upgraded" : "Upgrade", bard.isUpgraded],
          ["socket", "Socket", !!bard.socket, bard.socket],
          ["utility", "Utility", !!bard.utility, bard.utility],
        ]) {
          const button = element("button", `btn btn-sm ${applied ? "btn-success" : "btn-outline-success"} mr-2 mb-1`, item ? `${label}: ` : label);
          button.type = "button";
          button.disabled = state === "upgrade" && bard.isUpgraded;
          button.title = item ? `${label}: ${item.name}` : label;
          button.setAttribute("aria-label", `${button.title} for ${bardName(bard.instrument, "bard")} in slot ${number}`);
          if (item) {
            const icon = element("img", "skill-icon-xs ml-1");
            icon.src = item.media;
            icon.alt = "";
            button.append(icon);
          }
          button.onclick = () => openEquipment(slot, state);
          enhancements.append(button);
        }
        card.append(enhancements);
        appendModifiers(card, music, bard.instrument, level => openMastery(slot, level));
      } else {
        heading.append(element("span", "text-muted", "No bard hired. Choose Hire on an unlocked instrument."));
        card.append(heading);
      }
      slotGrid.append(card);
    }
    slotCount.textContent = `${hired}/${slots.length} hired`;
    rosterIndicator.hidden = !needsAttention;
    toggle.setAttribute("aria-describedby", rosterIndicator.hidden ? "" : rosterIndicator.id);
    for (const [instrument, indicator] of masteryIndicators) {
      indicator.hidden = !music.manager.getModifiers(instrument).some(modifier => canUnlockMastery(music, instrument, modifier));
    }
    music.renderQueue.bardModifiers = false;
  }

  ctx.patch(music.constructor, "hire").replace(function (_original, instrument) {
    if (music.bards.isHired(instrument)) return;
    const cost = troupe.hireCost(instrument);
    if (cost === undefined) {
      return SwalLocale.fire({
        icon: "warning",
        titleText: "Cannot hire this bard",
        text: "This instrument is not available for hire."
      });
    }

    const content = element("div", "text-left");
    content.append(element("h5", "mb-2", `Hire ${bardName(instrument)}?`));
    content.append(element("p", "font-w600", `${cost.toLocaleString()} GP`));
    appendModifiers(content, music, instrument);
    content.append(element("p", "text-danger font-size-sm mt-3", "Replacing a bard loses its instrument upgrade, socket, and utility."));
    const status = element("p", "text-danger font-size-sm");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const choices = element("div", "d-flex flex-wrap justify-content-center");
    for (const [index, slot] of troupe.slots().entries()) {
      const number = index + 1;
      const bard = music.bards.get(slot);
      const label = bard ? `Replace ${bard.instrument.name} (slot ${number})` : `Hire in slot ${number}`;
      const button = element("button", "btn btn-primary m-1 font-size-xs", label);
      button.type = "button";
      button.onclick = () => {
        if (troupe.hire(instrument, slot)) {
          render();
          SwalLocale.close();
        } else {
          status.textContent = "Could not hire this bard. Check your GP, instrument unlocks, and available slots.";
        }
      };
      choices.append(button);
    }
    content.append(status, choices);
    return SwalLocale.fire({
      html: content,
      icon: "info",
      showCancelButton: true,
      showConfirmButton: false,
      showDenyButton: false,
      customClass: { cancelButton: "btn btn-danger m-1 font-size-xs", actions: "mt-0" }
    });
  });

  ctx.patch(music.constructor, "renderBardModifiers").replace(function () {
    if (music.renderQueue.bardModifiers) render();
  });

  ctx.onInterfaceReady(() => {
    const native = document.getElementById("bard-container");
    if (!native) throw new Error("Bardic Troupe could not find Music's bard controls.");
    roster = element("div", "col-12");
    roster.id = "bardic-troupe-roster";
    const panel = element("div", "block block-rounded");
    toggle = element("button", "block-header block-header-default w-100 text-left bardic-troupe-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-controls", "bardic-troupe-slots");
    const title = element("span", "block-title");
    const eye = element("i", "");
    eye.setAttribute("aria-hidden", "true");
    slotCount = element("span", "badge badge-secondary ml-2");
    rosterIndicator = upgradeIndicator("A hired bard has a mastery bonus available or a missing instrument enhancement (costs still apply).");
    rosterIndicator.id = "bardic-troupe-attention";
    rosterIndicator.className += " ml-2";
    title.append(eye, element("span", "", "Toggle Bardic Troupe"), slotCount, rosterIndicator);
    toggle.append(title);
    body = element("div", "block-content block-content-full");
    slotGrid = element("div", "");
    slotGrid.id = "bardic-troupe-slots";
    body.append(slotGrid);
    function setExpanded(expanded) {
      body.hidden = !expanded;
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", `${expanded ? "Hide" : "Show"} bard slots`);
      toggle.title = `${expanded ? "Hide" : "Show"} bard slots`;
      eye.className = expanded ? "far fa-eye mr-2" : "far fa-eye-slash mr-2";
      if (expanded) render();
    }
    toggle.onclick = () => setExpanded(body.hidden);
    setExpanded(false);
    panel.append(toggle, body);
    roster.append(panel);
    native.after(roster);
    native.hidden = true;
    for (const [instrument, component] of music.userInterface.instruments) {
      const card = document.getElementById(component.localId);
      // PetiteVue removes @click attributes, so identify the native button by its localized label before adding the marker.
      const mastery = [...card?.querySelectorAll("button") ?? []]
        .find(button => button.textContent.trim() === getLangString("Myth_Music_Mastery"));
      if (!mastery) continue;
      const indicator = upgradeIndicator();
      indicator.hidden = true;
      mastery.prepend(indicator);
      masteryIndicators.set(instrument, indicator);
    }
    render();
  });
}

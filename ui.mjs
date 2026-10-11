function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function canUnlockMastery(music, instrument, modifier) {
  return !modifier.isActive && !modifier.isUpgrade && modifier.level < 100 &&
    music.getMasteryLevel(instrument) >= modifier.level;
}

function upgradeIndicator(description = "Mastery bonus available to unlock (costs still apply).") {
  const indicator = element("span", "bardic-troupe-upgrade-indicator text-warning mr-1", "♫");
  indicator.setAttribute("role", "img");
  indicator.setAttribute("aria-label", description);
  indicator.title = description;
  return indicator;
}

function appendModifiers(container, music, instrument) {
  for (const modifier of music.manager.getModifiers(instrument)) {
    const row = element("div", modifier.isActive ? "text-success" : "myth-text-grey");
    if (canUnlockMastery(music, instrument, modifier)) row.append(upgradeIndicator());
    if (modifier.isUpgrade) {
      row.append(element("span", "mr-1", "Upgrade: "));
    } else if (!modifier.isActive) {
      row.append(element("span", "mr-1", `(Mastery ${modifier.level}) `));
    }
    const description = element("span", "");
    description.innerHTML = modifier.description;
    row.append(description);
    container.append(row);
  }
}

export function installControls(ctx, music, troupe) {
  let roster;
  let slotGrid;
  let slotCount;
  const masteryIndicators = new Map();

  function render() {
    if (!slotGrid) return;
    const slots = troupe.slots();
    let hired = 0;
    slotGrid.replaceChildren();
    for (const [index, slot] of slots.entries()) {
      const number = index + 1;
      const bard = music.bards.get(slot);
      const card = element("div", "block block-rounded border-top border-music border-4x p-3");
      const heading = element("div", "d-flex flex-wrap align-items-center mb-2");
      heading.append(element("span", "font-size-lg mr-2", `Slot ${number}`));
      if (bard) {
        hired++;
        const image = element("img", "instrument-icon mr-2");
        image.src = bard.instrument.media;
        image.alt = "";
        heading.append(image, element("span", "font-size-lg mr-2", `${bard.instrument.name} Bard`));
        const manage = element("button", "btn btn-success ml-auto", "Instrument");
        manage.type = "button";
        const manageLabel = `Manage ${bard.instrument.name} bard in slot ${number}`;
        manage.setAttribute("aria-label", manageLabel);
        if (!bard.isUpgraded || !bard.socket || !bard.utility) {
          const description = "Instrument enhancements available (upgrade, gem socket, or utility missing; costs still apply).";
          manage.prepend(upgradeIndicator(description));
          manage.setAttribute("aria-label", `${manageLabel}. ${description}`);
        }
        manage.onclick = () => {
          const current = music.bards.get(slot);
          if (!current) return;
          music.userInterface.bard1.setBard(current);
          // The native modal reads bard1 in didOpen, after equipment() returns.
          music.userInterface.bard1.equipment();
        };
        heading.append(manage);
        card.append(heading);
        const enhancements = element("div", "d-flex flex-wrap mb-2");
        if (bard.isUpgraded) enhancements.append(element("span", "badge badge-success mr-1", "Upgraded"));
        if (bard.socket) enhancements.append(element("span", "badge badge-success mr-1", `Socket: ${bard.socket.name}`));
        if (bard.utility) enhancements.append(element("span", "badge badge-success mr-1", `Utility: ${bard.utility.name}`));
        if (enhancements.children.length) card.append(enhancements);
        appendModifiers(card, music, bard.instrument);
      } else {
        heading.append(element("span", "text-muted", "No bard hired. Choose Hire on an unlocked instrument."));
        card.append(heading);
      }
      slotGrid.append(card);
    }
    slotCount.textContent = `${hired}/${slots.length} hired`;
    for (const [instrument, indicator] of masteryIndicators) {
      indicator.hidden = !music.manager.getModifiers(instrument).some(modifier => canUnlockMastery(music, instrument, modifier));
    }
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
    content.append(element("h5", "mb-2", `Hire ${instrument.name} Bard?`));
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
    if (!roster || !music.renderQueue.bardModifiers) return;
    render();
    music.renderQueue.bardModifiers = false;
  });

  ctx.onInterfaceReady(() => {
    const native = document.getElementById("bard-container");
    if (!native) throw new Error("Bardic Troupe could not find Music's bard controls.");
    roster = element("div", "col-12");
    roster.id = "bardic-troupe-roster";
    const panel = element("div", "block block-rounded");
    const toggle = element("button", "block-header block-header-default w-100 text-left bardic-troupe-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-controls", "bardic-troupe-slots");
    const title = element("span", "block-title");
    const eye = element("i", "");
    eye.setAttribute("aria-hidden", "true");
    slotCount = element("span", "badge badge-secondary ml-2");
    title.append(eye, element("span", "", "Toggle Bardic Troupe"), slotCount);
    toggle.append(title);
    const body = element("div", "block-content block-content-full");
    slotGrid = element("div", "");
    slotGrid.id = "bardic-troupe-slots";
    body.append(slotGrid);
    function setExpanded(expanded) {
      body.hidden = !expanded;
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", `${expanded ? "Hide" : "Show"} bard slots`);
      toggle.title = `${expanded ? "Hide" : "Show"} bard slots`;
      eye.className = expanded ? "far fa-eye mr-2" : "far fa-eye-slash mr-2";
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

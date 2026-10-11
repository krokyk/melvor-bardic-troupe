# Bardic Troupe

Bardic Troupe is a Melvor Idle addon for [Myth] Music that lets you hire a different bard for every available instrument and keep their bonuses active together.
Version: **1.2.0**.

## Requirements

- Install and enable [[Myth] Music](https://mod.io/g/melvoridle/m/myth-music), mod.io ID **3096259**.
- The addon expects Music's current save format **4** and its existing hired-bard interface.
- Unlock the Music skill before buying troupe slots or hiring bards.

## How it works

1. Open the **Bardic Troupe** shop category.
2. Buy **Bardic Troupe I**, **Bardic Troupe II**, and subsequent upgrades in order for **500,000,000 GP each by default**.
   Each purchase unlocks one additional bard slot.
3. Choose **Hire** on an unlocked Music instrument and select an empty slot or a bard to replace.
4. Use **Upgrade**, **Socket**, **Utility**, or a **Mastery** button on a hired bard to open the matching Music menu.

Slot purchases require **actual Music level 100 by default**, with a shared level requirement and GP price configurable in Mod Settings.
Further purchases stop being offered once your total slot capacity covers every instrument registered by Music, including instruments you have not unlocked yet.
Each instrument can have only one hired bard.
Music's training, instrument unlocks, mastery bonuses, hiring costs, and instrument enhancements retain their normal behavior.
Replacing a bard loses that bard's upgrade, socket, and utility, as in Music.

The compact **Toggle Bardic Troupe** bar shows an eye icon and the number of hired bards out of your total slots.
It also shows a gold **♫**, including while collapsed, when any hired bard has an eligible unpurchased mastery bonus or a missing instrument enhancement.
The bar's cue clears once every hired bard has all three enhancements and no available mastery bonuses; unhired instruments do not affect it.
The roster starts collapsed whenever the interface loads; click anywhere on the bar to show or hide it, just like combat's skill-progress toggle.
The bar also supports Enter and Space when focused.
Bard cards use two columns when the panel is at least 46rem wide, or 736px at the standard text size, and stack in one column when the panel is narrower.
Hiring or refreshing bard bonuses keeps the roster in its current open or closed state.
Each hired bard has separate **Upgrade**, **Socket**, and **Utility** shortcut buttons instead of an Instrument button.
Missing enhancements use a green outline; applied enhancements use solid green.
An upgraded instrument shows a disabled **Upgraded** button.
Socket and Utility buttons show the equipped item's icon when filled, with its name in the tooltip and accessible label, and remain clickable so you can change the item.
The shortcuts open Music's matching upgrade confirmation or item-selection menu, where normal material requirements still apply.

Each purchasable mastery bonus has a **Mastery 40**, **Mastery 75**, or **Mastery 99** button beside its description.
The button is grey and disabled before its mastery requirement is met, outlined green when available to unlock, and solid green and disabled after the bonus is purchased.
An available button opens only Music's unlock confirmation for that tier; confirming purchases the bonus and closes the popup.
Back cancels and closes the popup without spending resources.
Normal GP and Essence of Music costs still apply, even if an available button is green.
Music's instrument-card buttons retain their existing behavior, including the gold **♫** on **Mastery** while an eligible bonus remains unpurchased.
This cue also works for unhired instruments, and all roster states and cues update after mastery changes, purchases, and save restoration.

Music's **Band Practice** purchase is hidden and blocked while this addon is enabled.
An already purchased Band Practice slot is preserved, and Music's master ancient relic still grants its additional slot.

## Mod Settings

Open Bardic Troupe in Melvor's native **Mod Settings** to change the required Music skill level and GP price for all troupe slot upgrades together.
The defaults are **Music level 100** and **500,000,000 GP per slot**.
The level must be a positive whole number and uses your actual skill level, not your virtual level.
Set it to **99 or lower** if your character is capped at level 99.
The price must be a nonnegative whole number; **0 makes slot purchases free**.

Changes immediately update the shop's prices, requirements, and labels.
You must still buy each preceding troupe upgrade first.
Purchased slots and existing bards are retained, and price changes do not refund previous purchases.
Settings are saved separately for each character.

## Saves and disabling the addon

Additional bards and their enhancements use Melvor's native character storage, while slot purchases use the normal shop save data.
The addon saves only Music's original bard slots into Music's own data so that disabling Bardic Troupe does not leave extra bonuses active on invisible bards.
Music's original bards are retained when the addon is disabled.
Saving without the addon can discard its slot purchases, additional hires, and their enhancements through Melvor's normal handling of missing mod data.
Keep an exported save with the addon enabled if you want to recover that state later.

Use a published mod.io installation or a Creator Toolkit build linked to an installed mod.io listing when testing persistence and cloud saves.
The inspected game source serializes character storage for installed mods, so an unlinked Creator Toolkit import can lose the additional bard state even though it works during the current session.
There is intentionally no browser-local storage fallback.

## Package and development

The release archive is **bardic-troupe-1.2.0.zip** and contains these seven files at its root:

```text
manifest.json
setup.mjs
config.mjs
troupe.mjs
ui.mjs
ui.css
icon.svg
```

The manifest loads `ui.css` along with the addon scripts.
No build step or runtime dependency beyond Music is required.
Do not include tests or documentation in the release archive.
Run the local automated checks from this directory with `node --test`.
These checks do not replace an in-game test of hiring, enhancements, save reloads, addon removal, and cloud saves.
Browser layout checks pass with Music's markup, Melvor's styles, and 15 mock bards at viewport widths of 1280, 768, 390, and 320px.
The [desktop](assets/bardic-troupe-layout-preview.png) and [phone](assets/bardic-troupe-layout-mobile.png) previews use test data.
No live character or save was used for this UI verification.

When publishing, configure Music as a hard dependency in mod.io using ID **3096259**.
Melvor's current manifest loader does not support declaring that dependency in `manifest.json`.
The addon also checks that Music is available during setup.
Ready-to-paste listing text and release notes are in [MOD_IO.md](MOD_IO.md).

## References

- [Music source and gameplay documentation](https://github.com/mythridium/music).
- [Current Melvor mod API, character storage, and dependency loading](https://melvoridle.com/assets/js/built/mod.js).
- [Current Melvor shop purchases and save handling](https://melvoridle.com/assets/js/built/shop.js).
- [Current Melvor game save ordering](https://melvoridle.com/assets/js/built/game.js).
- [Current Melvor character loading and offline processing](https://melvoridle.com/assets/js/built/main.js).

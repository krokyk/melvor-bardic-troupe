# mod.io listing

## Title

Kroky's Bardic Troupe

## Slug

krokys-bardic-troupe

## Summary

Build a full troupe of hired bards in [Myth] Music and enjoy their passive bonuses together.
Buy additional slots in order, with a configurable Music level requirement and GP price.

## Description

**Kroky's Bardic Troupe** expands [[Myth] Music](https://mod.io/g/melvoridle/m/myth-music) so you can hire a full ensemble and keep their passive bonuses active together while you train other skills.

- Buy **Bardic Troupe I**, **Bardic Troupe II**, and later upgrades in order from the **Bardic Troupe** shop category.
  The defaults are **actual Music level 100** and **500,000,000 GP per additional slot**.
- Set a shared Music level requirement and GP price for every troupe slot upgrade in native **Mod Settings**.
  Choose a positive whole level and a nonnegative whole GP price; **0 GP makes slots free**.
  The level uses your actual skill level, not your virtual level, so choose **99 or lower** if your character is capped at 99.
- Expand your capacity to cover every instrument in Music, with **one hired bard per different instrument**.
- Train and hire **Cello**, a powerful combat bard unlocked at **Music level 118** with **Throne of the Herald enabled**.
  With all Music content enabled, the troupe supports sixteen different instruments.
- Keep Music's normal instrument unlocks, mastery bonuses, hiring costs, upgrades, sockets, and utilities.
- Retain an already purchased **Band Practice** slot and the master ancient relic's additional slot.
  Band Practice is hidden and cannot be purchased while this addon is enabled.

Choose an empty slot or a bard to replace when hiring, then use the roster's **Upgrade**, **Socket**, and **Utility** shortcuts to manage its enhancements.
Replacing a bard loses its upgrade, socket, and utility, as in Music.

The compact **Toggle Bardic Troupe** bar shows an eye icon and your hired-bard count out of the total slots.
It also shows a gold **♫**, including while collapsed, if any hired bard has an eligible unpurchased mastery bonus or a missing instrument enhancement.
Unhired instruments do not affect this bar's cue.
Click anywhere on the bar to show or hide the roster, just like combat's skill-progress toggle.
The roster starts collapsed whenever the interface loads, and the bar also supports Enter and Space when focused.
Cards appear in two columns when there is room and stack in one column in narrow panels.
Hiring and bonus updates keep the roster open or closed as you left it.

All roster shortcuts match the compact height of Melvor's labels, with item icons scaled to fit.
Missing enhancements have green outlined buttons; applied enhancements have solid green buttons.
The completed **Upgraded** button is disabled, while **Socket** and **Utility** remain clickable and show the equipped item's icon, with its name in the tooltip.
Each shortcut opens the matching Music menu and retains normal material requirements.

Mastery bonuses have **Mastery 40**, **Mastery 75**, and **Mastery 99** shortcut buttons beside their descriptions.
They are grey and disabled before the required mastery level, outlined green when available to unlock, and solid green and disabled once purchased.
Available buttons open only Music's unlock confirmation for the selected tier, then close the popup after purchase or cancellation.
Normal GP and Essence of Music costs still apply.
Music's instrument-card buttons retain their existing behavior and the gold **♫** cue on **Mastery** while an eligible bonus remains unpurchased, including on unhired instruments.
Roster states and cues update as mastery levels, purchased bonuses, enhancements, or loaded saves change.

Settings are saved separately for each character and immediately update the shop's prices, requirements, and labels.
Previous troupe upgrades are still required in order.
Changing settings keeps purchased slots and existing bards, and does not refund earlier purchases.

Cello provides these bonuses while hired, at the same strength under Music's Standard and Hardcore modifier settings:

- **Mastery 1:** +50 percentage points each to ammunition, rune, food, Prayer-point, and Summoning-tablet preservation; −3 flat Prayer-point cost, with a minimum modified cost of 1 before preservation.
- **Mastery 40:** +20 percentage points critical-hit chance, +100 percentage points critical damage multiplier, and +10% lifesteal.
- **Mastery 75:** +20 percentage points Normal Damage Reduction and +100% evasion against all three attack styles.
- **Mastery 99:** +100% accuracy and maximum hit for melee, ranged, and magic; +20% of maximum hit added to minimum hit; −20% attack interval.
- **Instrument upgrade:** Allows a third active prayer, for a maximum of three while the upgraded Cello bard is hired at Music level 118 or higher.

Normal game caps and combat rules apply, including the 80% combat preservation cap and prayer-book restrictions.
Cello uses Music's normal mastery purchases, upgrade costs, sockets, and utilities.
Losing the Cello upgrade removes prayers beyond the first two from every equipment set.
The addon saves the third prayer separately and restores it when eligible; native saves contain at most two prayers per equipment set.

Train one Music instrument at a time.
For training several instruments at once, use the optional **Kroky's Workforce** mod.

**Requires [Myth] Music (mod.io ID 3096259).**
Kroky's Workforce is not required.

**Save warning:** Export your save before disabling or removing the addon.
Saving without it can discard purchased troupe slots, additional bards, and their enhancements; Music's original bards are retained.

## Homepage

https://github.com/krokyk/melvor-bardic-troupe

## Listing tags

| Field | Value |
| --- | --- |
| Type tags | QoL, Cheat, Combat, Non-Combat, UI, Offline |
| Platform tags | Desktop, Browser, iOS, Android |
| Game version | 1.3.1 |

## Community options

- Allow comments: Yes.
- Allow collections: Yes.

## Listing image

`assets/listing-image.png`

Use a 16:9 image of at least 512 × 288 pixels and no more than 8 MB.

## Version

2.1.1

## Changelog

### 2.1.1

- Load Cello through Melvor's module loader so Bardic Troupe starts in Creator Toolkit and mod.io installations.

### 2.1.0

- Add Cello at Music level 118 with Throne of the Herald enabled, including training, mastery, completion, Concert Pass XP, and instrument artwork.
- Expand the troupe shop to accommodate the additional instrument using the shared slot settings.
- Add combat preservation, Prayer cost reduction, critical hits, lifesteal, evasion, Damage Reduction, accuracy, damage, and attack speed bonuses.
- Allow three prayers while the upgraded Cello bard is hired, with prayer-book restrictions, addon save restoration, and cleanup when the upgrade is lost.

### 2.0.0

- Add a fully clickable, collapsible troupe bar and a responsive roster with two columns when space allows.
- Add compact Upgrade, Socket, and Utility shortcuts with scaled equipped-item icons and clear missing or applied states.
- Add Mastery 40, 75, and 99 shortcuts with grey locked, outlined available, and solid green purchased states.
- Open Music's mastery purchase confirmation directly, close it after purchase or cancellation, and disable completed Upgrade and Mastery buttons.
- Show gold **♫** cues for available mastery bonuses and missing enhancements, including on the collapsed troupe bar.
- Configure the Music level and GP cost for additional slots, defaulting to level 100 and 500M GP each.
- Preserve existing slot purchases, hired bards, enhancements, and character settings when updating.

### 1.2.0

- Replace the roster's Instrument button and status badges with direct Upgrade, Socket, and Utility menu shortcuts, using outlines for missing enhancements and solid green for applied ones.
- Show equipped gem and utility icons, keep their selection menus available, and disable the completed Upgraded button.
- Size roster shortcuts like native labels and scale gem and utility icons to fit.
- Add Mastery 40, 75, and 99 shortcuts with grey, green outlined, and solid green states for locked, available, and purchased bonuses.
- Open only Music's native confirmation for an available mastery tier, close it after purchase or cancellation, and disable purchased mastery buttons while retaining normal costs and skill-card controls.
- Keep the gold music-note cue on native instrument Mastery buttons while eligible bonuses remain unpurchased.
- Show the same cue on the troupe bar, including while collapsed, when any hired bard has an available mastery bonus or a missing enhancement.
- Refresh cues after mastery level changes, bonus purchases, and save restoration while retaining Music's normal costs and controls.

### 1.1.2

- Make the entire troupe bar clickable, with the eye icon on the left, like combat's skill-progress toggle.
- Retain keyboard activation, the hired-bard count, and the roster's open or closed state during updates.

### 1.1.1

- Fix the overflowing roster with a compact panel showing a slot icon, hired-bard count, and an eye control, initially collapsed, with up to two columns that stack in narrow panels.
- Keep the roster's open or closed state during hiring and bonus updates, with Music's Instrument controls unchanged.

### 1.1.0

- Add shared Mod Settings for the required Music level and GP price of every troupe slot upgrade.
- Set the default requirement to actual Music level 100, with the price remaining 500M GP per slot.
- Apply changes immediately while retaining purchased slots, existing bards, and upgrade prerequisites.

### 1.0.0

- Add sequential bard slot upgrades for 500M GP each.
- Add a troupe roster with hiring choices and Music's instrument enhancement controls.
- Hide Band Practice while preserving existing slots and the master relic bonus.
- Retain Music's original bards when the addon is disabled.

## Upload configuration

- Upload **bardic-troupe-2.1.1.zip** with `manifest.json`, `setup.mjs`, `config.mjs`, `troupe.mjs`, `cello.mjs`, `ui.mjs`, `ui.css`, and `icon.svg` at the archive root, plus `assets/cello.png`.
- Exclude tests and documentation from the archive.
- Set **[Myth] Music**, mod.io ID **3096259**, as a hard dependency in mod.io.
  The current Melvor manifest loader does not read dependency declarations from `manifest.json`.
- Link the Creator Toolkit build to the installed mod.io listing before testing reload and cloud-save persistence.
  Unlinked Toolkit imports can lose additional bard state after reloading.

Browser layout checks pass with Music's markup, Melvor's styles, and 15 mock bards at viewport widths of 1280, 768, 390, and 320px.
No live character or save was used for this UI verification.

Source references: [Music](https://github.com/mythridium/music), [Melvor mod API](https://melvoridle.com/assets/js/built/mod.js), and [Melvor shop save handling](https://melvoridle.com/assets/js/built/shop.js).

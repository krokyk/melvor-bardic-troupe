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
  The defaults are **actual Music level 100** and **1,000,000,000 GP per additional slot**.
- Set a shared Music level requirement and GP price for every troupe slot upgrade in native **Mod Settings**.
  Choose a positive whole level and a nonnegative whole GP price; **0 GP makes slots free**.
  The level uses your actual skill level, not your virtual level, so choose **99 or lower** if your character is capped at 99.
- Expand your capacity to cover every instrument in Music, with **one hired bard per different instrument**.
- Train and hire **The Conductor**, a combat bard unlocked at **Music level 118** with **Throne of the Herald enabled**, represented by a conductor's baton.
  With all Music content enabled, the troupe supports sixteen different instruments.
- Enable the optional **Extra preservation and doubling** bonuses in Mod Settings, with separate +5-point awards across the fifteen instruments before The Conductor.
  The toggle defaults to **OFF for new and existing characters**.
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

Mastery bonuses have **Mastery 20**, **Mastery 40**, **Mastery 65**, and **Mastery 99** shortcut buttons beside their descriptions.
They are grey and disabled before the required mastery level, outlined green when available to unlock, and solid green and disabled once purchased.
Available buttons open the selected tier’s purchase confirmation and close after purchase or cancellation.
Each mastery purchase costs GP and one Essence of Music.
Music's instrument-card **Mastery** buttons open the remapped overview and retain the gold **♫** cue while an eligible bonus remains unpurchased, including on unhired instruments.
Roster states and cues update as mastery levels, purchased bonuses, enhancements, or loaded saves change.

Settings are saved separately for each character and immediately update the shop's prices, requirements, and labels.
Previous troupe upgrades are still required in order.
Changing settings keeps purchased slots and existing bards, and does not refund earlier purchases.

**Extra preservation and doubling** adds **Chance to Double Items in Skills** and **Chance to Preserve Resources in Skills** at these tiers when enabled.
Each award adds **5 percentage points** to one bonus; no tier receives both additions.

| Instrument | Extra doubling tier | Extra preservation tier |
| --- | --- | --- |
| Guitar | Base | — |
| Banjo | Mastery 40 | Base |
| Snare Drum | Base | Mastery 40 |
| Accordion | — | Base |
| Bouzouki | Mastery 20 | Mastery 65 |
| Flute | — | Mastery 65 |
| Maraca | Mastery 20 | Instrument upgrade |
| Xylophone | — | Mastery 20 |
| Saxophone | Mastery 65 | — |
| Violin | Mastery 65 | Mastery 20 |
| Djembe | Instrument upgrade | — |
| French Horn | — | Mastery 40 |
| Harp | Mastery 40 | — |
| Tambourine | Instrument upgrade | — |
| Trumpet | — | Instrument upgrade |

The ten awards per bonus total **+50 percentage points each** when all relevant bards are hired and their listed tiers are active.
Normal levels, mastery purchases, instrument upgrades, expansion requirements, and game caps still apply; unavailable expansion shares are not reassigned.
The additions are identical under Music's Standard and Hardcore modifier settings.
The toggle is saved per character, defaults to OFF, and immediately updates active bonuses and descriptions when changed.
When OFF, only the additions disappear completely; Music's original bonuses, purchased masteries, and instrument enhancements are retained.
The Conductor grants neither of these two skill bonuses, regardless of the toggle.

The Conductor provides these bonuses while hired, at the same strength under Music's Standard and Hardcore modifier settings:

- **Mastery 1:** +200 Maximum Hitpoints.
- **Mastery 20:** +10 percentage points critical-hit chance, +50 percentage points critical damage multiplier, and +5% lifesteal.
- **Mastery 40:** +10 percentage points Normal Damage Reduction and +50% evasion against all three attack styles.
- **Mastery 65:** +50% accuracy and maximum hit for melee, ranged, and magic; +10% of maximum hit added to minimum hit.
- **Mastery 99:** −25% Summoning Familiar Attack Interval and −10% character Attack Interval.
- **Instrument upgrade:** Allows a third active prayer, for a maximum of three while The Conductor is upgraded and hired at Music level 118 or higher.

Normal game caps and combat rules apply, including the 80% combat preservation cap and prayer-book restrictions.
The Conductor supports the remapped mastery purchases and Music's normal upgrade costs, sockets, and utilities.
Losing The Conductor's upgrade removes prayers beyond the first two from every equipment set.
The addon saves the third prayer separately and restores it when eligible; native saves contain at most two prayers per equipment set.

The mastery tiers are **1, 20, 40, 65, and 99**, with Music's mastery level cap unchanged.
Mastery **20, 40, 65, and 99** purchases cost **100K, 1M, 10M, and 100M GP**, respectively, plus **1 Essence of Music each**.
Each purchase requires its listed mastery level and the instrument's normal unlock.
The added rewards apply while hired, independently of the extra skill bonus toggle, and have the same strength in Standard and Hardcore settings.

The added preservation rewards occupy their own lower mastery tiers.
Every bard has rewards at Mastery 1, 20, 40, 65, and 99.
Existing base bonuses and instrument upgrades are retained.
The table lists Standard bonus values; native Hardcore values remain unchanged, and added rewards have equal strength in both modes.

| Bard | Mastery 20 | Mastery 40 | Mastery 65 | Mastery 99 |
| --- | --- | --- | --- | --- |
| Guitar | +50% Ammo Preservation | +15% Firemaking Mastery XP | -10% Firemaking Interval | +2 Bird Nest quantity |
| Banjo | +50% Food Preservation | -10% Cooking Interval | -30% Passive Cook Interval | +10% chance for an extra Fishing special item |
| Snare Drum | -0.2s Smithing Interval | +50% Rune Preservation | -3 Coal Ore cost | x4 Mining ore |
| Accordion | +15% Auto Eat Efficiency | +50% Consumable Charge Preservation | Enemy -10% Damage Reduction | +5% Auto Eat Threshold |
| Bouzouki | +10% Global GP | +10% rare-item chances | +50% Soul Point Preservation | +10% Global Item Doubling |
| Flute | -10% map-refinement cost | -10% survey interval | +15% Archaeology Skill XP | +2 Archaeology resources |
| Maraca | +5% Fletching Skill XP | x4 Fletching resources | -10% Crafting Interval | x4 Crafting resources |
| Xylophone | +15% Agility GP | -10% Agility Pillar cost | +15% Agility Mastery XP | -15% Agility Interval |
| Saxophone | +5% Maximum Hitpoints | +10% Lifesteal | +50% Unholy Prayer Point Preservation | +5% Damage Reduction |
| Violin | +1 Prayer Point when hit | +6 Runecrafting runes | +50% Prayer Point Preservation | -3 Prayer Point cost |
| Djembe | +40% Slayer Coins | +10% Slayer-task damage | +3% Damage Reduction during Slayer tasks | +25% Slayer-area effect negation |
| French Horn | -0.5s Astrology Interval | +50% Summoning Charge Preservation | -1s Summoning Interval | +15 Summoning resources |
| Harp | +50 Thieving Stealth | +50% Potion Charge Preservation | +15% Thieving area-unique chance | x4 Herblore resources |
| Tambourine | +50% Compost Preservation | +10% Township GP | +50% Township Happiness | +15 Farming resources |
| Trumpet | +5% of maximum hit added to minimum hit | +10% Maximum Hit | +5% Critical Hit Chance | -0.5s Attack Interval |

The Conductor retains its separate combat layout, including +200 Maximum Hitpoints at Mastery 1 and both attack interval reductions at Mastery 99.
No mastery slots are unassigned.
Generic skill resource preservation is covered by the optional skill bonuses.
Snare Drum's rune preservation also applies to Alt. Magic, so Flute has no additional rune-preservation reward.
Soul Point preservation requires Into the Abyss content to be useful.
The Conductor retains the saved Cello action identity, including mastery, hired status, and enhancements.
Added reward purchases are saved separately per character without increasing native hiring prices.

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

`assets/cover.png`

Use a 16:9 image of at least 512 × 288 pixels and no more than 8 MB.

## Version

2.3.1

## Changelog

### 2.3.1

- Use **The Conductor** as the display name, without a Bard suffix in roster headings, hire confirmations, or enhancement labels.
- Grant +200 Maximum Hitpoints at Mastery 1 and place the −10% character Attack Interval bonus alongside the −25% Summoning Familiar Attack Interval bonus at Mastery 99.

- Remap all earlier tiers to 1, 20, 40, and 65, with final rewards at 99 and no mastery-cap increase.
- Retain native mastery purchases and The Conductor's earlier final-tier unlock, and use 100K, 1M, 10M, and 100M GP for the four paid tiers.
- Give preservation its own lower-tier rewards and place stronger native rewards at Mastery 99, filling every mastery slot.
- Omit Flute's Alt. Magic rune-preservation reward because Snare Drum's rune preservation covers those spells.
- Add Archaeology XP for Flute, Crafting interval for Maraca, Agility Mastery XP for Xylophone, conditional Slayer-task Damage Reduction for Djembe, and critical-hit chance for Trumpet.

### 2.3.0

- Rename Cello to The Conductor, with a transparent baton icon and retained save identity.
- Halve The Conductor's Mastery 40, 75, and 99 combat bonuses and retain the third-prayer upgrade.
- Add Mastery 118 purchases for 100M GP and one Essence of Music, with roster shortcuts, native mastery menu entries, and per-character persistence.
- Give The Conductor +100 Maximum Hitpoints and −25% Summoning Familiar Attack Interval at Mastery 118.
- Distribute eleven +50% preservation rewards across other bards and remove The Conductor's base preservation and Prayer-point discount.

### 2.2.2

- Add the per-character **Extra preservation and doubling** toggle, defaulting to OFF for new and existing characters.
- Move the added skill bonuses from Cello to twenty separate +5-percentage-point awards across the fifteen earlier instruments, retaining a maximum of +50 points to each bonus.
- Apply toggle changes immediately to active bonuses and descriptions, hiding the additions completely while OFF without changing Music's native bonuses or purchased progress.
- Keep the additions identical under Standard and Hardcore settings, with normal tier requirements, expansion access, and game caps.
- Retain Cello's combat bonuses and third prayer.

### 2.2.1

- Register the skill-doubling modifier scope before Cello's instrument data to fix startup errors in Creator Toolkit and mod.io installations.

### 2.2.0

- Add +10 percentage points to skill item doubling and resource preservation at each Cello tier, reaching +50 points each when all mastery bonuses are purchased and the hired bard is upgraded.
- Apply doubling to skill outputs, including Alt. Magic and modded skills, with normal game caps and the same strength under Standard and Hardcore settings.

### 2.1.2

- Set the default slot price to 1B GP and retain the default requirement of actual Music level 100.

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

- Upload **bardic-troupe-2.3.1.zip** with `manifest.json`, `setup.mjs`, `config.mjs`, `troupe.mjs`, `conductor.mjs`, `mastery.mjs`, `bonuses.mjs`, `ui.mjs`, `ui.css`, and `icon.svg` at the archive root, plus `assets/conductor.png`.
- Exclude tests and documentation from the archive.
- Set **[Myth] Music**, mod.io ID **3096259**, as a hard dependency in mod.io.
  The current Melvor manifest loader does not read dependency declarations from `manifest.json`.
- Link the Creator Toolkit build to the installed mod.io listing before testing reload and cloud-save persistence.
  Unlinked Toolkit imports can lose additional bard state after reloading.

Browser layout checks pass with Music's markup, Melvor's styles, and 15 mock bards at viewport widths of 1280, 768, 390, and 320px.
Save slot #7 verifies all sixteen mastery layouts, retained hires and enhancements, purchases of all five added bonuses and Guitar's lower-tier preservation, the critical-chance increase from 14% to 19%, and purchase persistence after reload.

Source references: [Music](https://github.com/mythridium/music), [Melvor mod API](https://melvoridle.com/assets/js/built/mod.js), and [Melvor shop save handling](https://melvoridle.com/assets/js/built/shop.js).

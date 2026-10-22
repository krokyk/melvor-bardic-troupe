# Bardic Troupe

Bardic Troupe is a Melvor Idle addon for [Myth] Music that lets you hire a different bard for every available instrument and keep their bonuses active together.
Version: **2.3.1**.

## Requirements

- Install and enable [[Myth] Music](https://mod.io/g/melvoridle/m/myth-music), mod.io ID **3096259**.
- The addon expects Music's current save format **4** and its existing hired-bard interface.
- Unlock the Music skill before buying troupe slots or hiring bards.

## How it works

1. Open the **Bardic Troupe** shop category.
2. Buy **Bardic Troupe I**, **Bardic Troupe II**, and subsequent upgrades in order for **1,000,000,000 GP each by default**.
   Each purchase unlocks one additional bard slot.
3. Choose **Hire** on an unlocked Music instrument and select an empty slot or a bard to replace.
4. Use **Upgrade**, **Socket**, **Utility**, or a **Mastery** button on a hired bard to open the matching Music menu.

Slot purchases require **actual Music level 100 by default**, with a shared level requirement and GP price configurable in Mod Settings.
Further purchases stop being offered once your total slot capacity covers every instrument registered by Music, including instruments you have not unlocked yet.
Each instrument can have only one hired bard.
Music's existing instruments retain their training, unlocks, bonus values, hiring costs, and enhancements, with mastery tiers at 1, 20, 40, 65, and 99.
Replacing a bard loses that bard's upgrade, socket, and utility, as in Music.

The compact **Toggle Bardic Troupe** bar shows an eye icon and the number of hired bards out of your total slots.
It also shows a gold **♫**, including while collapsed, when any hired bard has an eligible unpurchased mastery bonus or a missing instrument enhancement.
The bar's cue clears once every hired bard has all three enhancements and no available mastery bonuses; unhired instruments do not affect it.
The roster starts collapsed whenever the interface loads; click anywhere on the bar to show or hide it, just like combat's skill-progress toggle.
The bar also supports Enter and Space when focused.
Bard cards use two columns when the panel is at least 46rem wide, or 736px at the standard text size, and stack in one column when the panel is narrower.
Hiring or refreshing bard bonuses keeps the roster in its current open or closed state.
Each hired bard has separate **Upgrade**, **Socket**, and **Utility** shortcut buttons instead of an Instrument button.
All roster shortcuts match the compact height of Melvor's labels, with item icons scaled to fit.
Missing enhancements use a green outline; applied enhancements use solid green.
An upgraded instrument shows a disabled **Upgraded** button.
Socket and Utility buttons show the equipped item's icon when filled, with its name in the tooltip and accessible label, and remain clickable so you can change the item.
The shortcuts open Music's matching upgrade confirmation or item-selection menu, where normal material requirements still apply.

Each purchasable mastery bonus has a **Mastery 20**, **Mastery 40**, **Mastery 65**, or **Mastery 99** button beside its description.
The button is grey and disabled before its mastery requirement is met, outlined green when available to unlock, and solid green and disabled after the bonus is purchased.
An available button opens the selected tier’s purchase confirmation; confirming purchases the bonus and closes the popup.
Back cancels and closes the popup without spending resources.
Normal GP and Essence of Music costs still apply, even if an available button is green.
The instrument-card **Mastery** button opens an overview of the remapped tiers and retains its gold **♫** while an eligible bonus remains unpurchased.
This cue also works for unhired instruments, and all roster states and cues update after mastery changes, purchases, and save restoration.

Music's **Band Practice** purchase is hidden and blocked while this addon is enabled.
An already purchased Band Practice slot is preserved, and Music's master ancient relic still grants its additional slot.

## Extra preservation and doubling

The per-character **Extra preservation and doubling** toggle is **OFF by default for new and existing characters**.
Enable it in Mod Settings to add **Chance to Double Items in Skills** and **Chance to Preserve Resources in Skills** to the fifteen instruments before The Conductor.
Every award below adds **5 percentage points** to one bonus at the listed tier; no tier receives both additions.

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
The base, Mastery 20, Mastery 40, Mastery 65, and instrument upgrade tiers each contain two doubling awards and two preservation awards across the troupe.
Normal instrument levels, mastery purchases, upgrade costs, expansion requirements, and game caps still apply; unavailable expansion shares are not reassigned.
The additions have the same strength under Music's Standard and Hardcore modifier settings.
Changing the toggle immediately refreshes active bonuses and descriptions.
When OFF, the additions disappear from all descriptions and have no effect, while Music's original bonuses, purchased masteries, and instrument enhancements are retained.
The Conductor grants neither of these two skill bonuses, regardless of the toggle.

## The Conductor

The Conductor unlocks at **Music level 118** with **Throne of the Herald enabled**.
With all Music content enabled, it is the sixteenth instrument and the troupe can hold all sixteen different bards.
The extra slot uses the same sequential purchases, configurable level requirement, and GP price as the other troupe slots.
The Conductor trains every 3 seconds before interval modifiers, grants 547 base Music XP, and has a base maximum tip of 705 GP before mastery and GP modifiers.
Its associated skills are Attack, Strength, Ranged, Magic, Defence, Hitpoints, Prayer, and Summoning, including Concert Pass XP.

| Bonus tier | Bonuses while hired |
| --- | --- |
| Mastery 1 | +200 Maximum Hitpoints. |
| Mastery 20 | +10 percentage points critical-hit chance, +50 percentage points critical damage multiplier, and +5% lifesteal. |
| Mastery 40 | +10 percentage points Normal Damage Reduction and +50% melee, ranged, and magic evasion. |
| Mastery 65 | +50% melee, ranged, and magic accuracy and maximum hit; +10% of maximum hit added to minimum hit. |
| Mastery 99 | −25% Summoning Familiar Attack Interval and −10% character Attack Interval. |
| Instrument upgrade | Allows three active prayers in total. |

These bonuses have the same strength under Music's Standard and Hardcore modifier settings.
Normal game caps and combat rules apply, including the 80% combat preservation cap.
The critical bonus adds to the combat sheet, so base values of 0% chance and 150% multiplier become 10% and 200%.
Mastery bonuses require their listed GP and Essence of Music purchases, and the instrument upgrade uses Music's usual Essence of Music cost.
The Conductor supports Music's sockets, utilities, mastery pool, completion, and saved mastery progress.
Its artwork contains only a conductor's baton.
Its saved action ID remains `KrokyBardicTroupe:Cello`, preserving existing mastery, hires, upgrades, sockets, and utilities.

The third prayer requires The Conductor to remain upgraded and hired at Music level 118 or higher.
Prayers must belong to the same prayer book and still meet the game's normal equipment, damage-type, and resource checks.
Losing the upgrade removes prayers beyond the first two from every equipment set.
The third prayer is stored with the addon and restored when eligible, while the native save contains at most two prayers per equipment set.

## Mastery bonuses

The mastery tiers are **1, 20, 40, 65, and 99**.
Bardic Troupe leaves Music's mastery level cap unchanged, including any cap supplied by another mod.
Mastery **20, 40, 65, and 99** purchases cost **100K, 1M, 10M, and 100M GP**, respectively, plus **1 Essence of Music each**.
Each purchase requires its listed instrument mastery level and the instrument's normal Music unlock.
Music's native purchase records retain each bard's original rewards.
Addon character storage retains each bard's added reward, regardless of its mastery tier.
Existing native mastery purchases and hiring prices are retained.
Bonuses apply while the corresponding bard is hired.
These rewards are independent of the optional extra skill preservation and doubling toggle.

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
Generic skill resource preservation is covered by the optional +50-point distribution.
Snare Drum's rune preservation also applies to Alt. Magic, so Flute has no additional rune-preservation reward.
Bypass modifiers and per-point Prayer modifiers affect existing preservation types rather than separate resources.
Archaeology's Very Rare or Legendary map-preservation perk is a conditional effect rather than a general percentage chance.
Soul Points require Into the Abyss content; the reward remains assigned to Bouzouki when that content is unavailable.

## Mod Settings

Open Bardic Troupe in Melvor's native **Mod Settings** to change the required Music skill level and GP price for all troupe slot upgrades together.
The defaults are **Music level 100** and **1,000,000,000 GP per slot**.
The level must be a positive whole number and uses your actual skill level, not your virtual level.
Set it to **99 or lower** if your character is capped at level 99.
The price must be a nonnegative whole number; **0 makes slot purchases free**.

The **Extra preservation and doubling** toggle controls the optional skill bonuses described above and defaults to OFF.

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

The release archive is **bardic-troupe-2.3.1.zip** and contains these runtime files, with `manifest.json` at its root:

```text
manifest.json
setup.mjs
config.mjs
troupe.mjs
conductor.mjs
mastery.mjs
bonuses.mjs
ui.mjs
ui.css
icon.svg
assets/conductor.png
```

The manifest loads `ui.css` along with the addon scripts.
No build step or runtime dependency beyond Music is required.
Do not include tests or documentation in the release archive.
Run the local automated checks from this directory with `node --test`.
These checks do not replace an in-game test of hiring, enhancements, save reloads, addon removal, and cloud saves.
Browser layout checks pass with Music's markup, Melvor's styles, and 15 mock bards at viewport widths of 1280, 768, 390, and 320px.
The [desktop](assets/bardic-troupe-layout-preview.png) and [phone](assets/bardic-troupe-layout-mobile.png) previews use test data.
Save slot #7 verifies all sixteen mastery layouts, retained hires and enhancements, purchases of all five added bonuses and Guitar's lower-tier preservation, the critical-chance increase from 14% to 19%, and purchase persistence after reload.
Live slot #7 combat verifies Djembe's +3% Normal Damage Reduction applies to Slayer-task monsters and is absent against other enemies.

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

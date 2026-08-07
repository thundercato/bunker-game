# Changelog

## 0.0.0.14 - 2026-08-07

- Removed the redundant bordered start-screen version badge while preserving the small bottom-right release number.
- Corrected the camera-zoom compensation for the TAP TO ENTER gate so it stays centred and fully visible in landscape.
- Retained and republished the v0.0.0.13 labyrinth visibility and starter-knife regression fixes in the new cache generation.
- Rotated the PWA cache and published version metadata for v0.0.0.14.

## 0.0.0.13 - 2026-08-06

- Fixed the labyrinth darkness mask so its visibility circle uses the player’s true screen position while the camera scrolls.
- Prevented a held interaction button from instantly returning the player to the bunker after entering the labyrinth or changing rooms.
- Moved the bunker-side labyrinth entrance beside the player’s valid starting floor position rather than beyond the southern wall.
- Started new games beside the labyrinth entrance with the utility knife already armed.
- Rotated the PWA cache and published version metadata for v0.0.0.13.

## 0.0.0.12 - 2026-08-06

- Unified the procedural labyrinth entrance and exit at the southern boundary and extended the playable grid, collision, camera and lighting bounds to the doorway.
- Added deterministic validation for the entrance, spawn, connectivity and exactly four edge exploration doors.
- Added one north, east, south and west exploration door, each terminating a reachable corridor and linked to a stable room ID.
- Replaced corridor-side placeholder drops with fade-driven transitions into persistent self-contained exploration rooms.
- Added deterministic room layouts, reusable bunker furniture textures, persistent chest lock state and a one-in-ten unlocked rule.
- Preserved the live labyrinth scene, enemies and room state while visiting side rooms, returning the player to the same doorway.
- Restored feathered player-centred labyrinth visibility and added a room radius four times larger without darkening DOM controls.
- Added static room camera fitting, room collision, resize and PWA focus lighting restoration, transition guards and held-input clearing.
- Added generation tests covering 100 seeds, deterministic doors and rooms, connectivity, furniture clearance and visibility configuration.

## 0.0.0.3 - 2026-08-04

- Rebuilt backpack rendering from one ordered carried-item list so storage slot numbers can no longer hide magazines, ammunition or the Makarov behind other items.
- Ensured taking the pistol, either magazine or ammunition returns to the live storage view and leaves the taken item available in the backpack.
- Allocated consumables into genuinely free cabinet slots instead of allowing food and drink to collide with firearm or base-item slots.
- Expanded the data-driven food catalogue with ration crackers, tinned peaches, tinned soup and edible beef jerky.
- Added cans of cola and orange pop with direct thirst restoration and one-use inventory consumption.
- Applied each food item's hydration value while eating, including dry-food thirst penalties and hydrating-food bonuses.
- Added strict catalogue tests covering food values, drink values, weights, stack sizes and flask capacity.

## 0.0.0.2 - 2026-08-04

- Fixed infinite MutationObserver decoration loops that froze the Makarov and water-flask inspection panels.
- Made firearm and consumable panel decoration idempotent so each panel is enhanced only once.
- Rotated PWA cache and deployed version metadata to v0.0.0.2.

## 0.0.0.1 - 2026-08-04

- Replaced stale copied storage arrays with an authoritative `InventoryStore`.
- Rebuilt the cabinet directly from live inventory state after every item mutation.
- Removed the duplicate TAKE listener and delayed stale redraw that caused partial cabinet contents and weapon inspection lock-ups.
- Returned base items and firearms to the cabinet view after taking them without losing the remaining item list.
- Added regression tests for repeated inventory rebuilds and canonical mutation notifications.
- Added a single visible release version source and reset development numbering to the four-part sequence.
- Added a versioned service worker, automatic old-cache deletion and network-first loading for navigation, manifest and version metadata.
- Added startup, foreground and focus update checks with a New Version Available reload notice.
- Added a landscape PWA manifest and a tiny bottom-right title-screen version string.

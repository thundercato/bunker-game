# Changelog

## 0.1.0.6 - 2026-08-03

- Added supported-device vibration feedback when the Makarov fires.
- Removed the on-screen BANG message from successful gunshots.
- Added a brief directional white muzzle flash beside the player sprite.
- Framed widescreen rooms from their exact top edge to exact bottom edge.
- Made framed-room zoom derive from room height, zooming out horizontally where necessary.

## 0.1.0.5 - 2026-08-03

- Corrected overlay sizing to use the game viewport rather than the browser viewport.
- Moved item inspection panels upward so their lower information and controls remain visible.
- Tightened item artwork, information and action layouts without introducing scrolling.
- Reframed the living quarters and training room against their actual room bounds.
- Removed the clipped room top and excessive black strip below framed rooms.

## 0.1.0.4 - 2026-08-03

- Rebuilt storage, backpack and item inspection screens as fixed landscape layouts.
- Removed scrolling and overscroll from all inventory and inspection overlays.
- Fitted the full 6 × 3 storage grid into one screen with a permanent right-side back control.
- Moved the 3 × 4 backpack grid left to reserve a right-side action area.
- Reworked item inspection with smaller artwork and information on the left and a vertical action list on the right.
- Added responsive scaling for narrower tablet and phone aspect ratios.

## 0.1.0.3 - 2026-08-03

- Added tactile Makarov PM cleaning at the weapon workstation.
- Added oil can, brush, cleaning rod and paper tools.
- Added a sixteen-section brown grime layer that is removed only where the player rubs.
- Added tool selection, oil-first cleaning behaviour and cleaning particles.
- Added a persistent Makarov condition gauge starting at 20%.
- Added the Makarov to the workstation weapon list when carried or armed.

## 0.1.0.2 - 2026-08-03

- Added a Makarov PM pistol to bunker storage.
- Added two eight-round Makarov magazines with persistent individual round counts.
- Added separate 9×18mm ammunition boxes and loose-round packets.
- Added backpack actions for loading and unloading magazines.
- Added ammunition packet merging and single-round removal.
- Added pistol magazine insertion and removal.
- Added slide racking, chambered-round handling, unloading and firing.
- Added touchscreen and gamepad firing through the existing weapon control.
- Reset the visible and package version to 0.1.0.2.

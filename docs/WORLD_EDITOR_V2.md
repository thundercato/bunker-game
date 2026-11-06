# World Editor v2: full-map authoring foundation

**Status: draft world editing, not yet integrated into live gameplay.** This release adds a full-map workspace alongside the existing building editor, without changing the playable Overgrowth v11 campaign.

## Open

- World editor: `/bunker-game/editor/world.html`
- Interior editor: `/bunker-game/editor/`

## Working tools

- Entire 600 × 850 m world overview with all 37 building footprints, 15 roads, the railway and water level.
- Raise, lower, smooth and flatten height-field terrain. Radius and strength controls, with 12 m height-grid resolution.
- Spray pine, fir, rock, fern and stump markers with seeded natural size and rotation variation; erase with a brush.
- Move buildings as one world entity. Their local interior coordinates remain unchanged in the authoring data. Automatic terrain-following height or manually locked height.
- Edit existing road and railway control points by dragging. Curved interpolation and height following are shown in the editor.
- Add water circles and adjust a global water level. A full hydrological or swimming simulation is **not** included.
- Layer visibility, region selection, undo/redo, local drafts, JSON import/export, basic foundation/slope checks.
- Double-click a building to open the established interior editor for that building.

## Known limitations and next engineering step

The editor renders **simple proxies** for buildings, vegetation and paths to keep the whole world navigable at desktop resolution. This is a spatial editing view, not the final game scene. Terrain changes and moved buildings are saved only to a world-draft JSON file. **They do not alter the running game, its collision or mission positions yet.** The full runtime compiler must be implemented and validated before publishing edited maps to players. Terrain/roads are authoring geometry and have not yet been made into permanent game-world assets.

The terrain-following model is defined by the draft height field. Buildings have a local origin, but the full building hierarchy and every world loot/mission anchor have not yet been migrated into this system. Roads currently follow height but do not automatically cut terrain or generate bridge structures. Water volumes are editable but not yet coupled to player drowning logic. The editor currently opens interiors in the existing separate workspace, not simultaneously in one scene.

The map editor has no direct GitHub write token; drafts remain local until exported, reviewed and committed. The original game saves are never modified by editing.

## Test coverage

The world-core test verifies brush operations, seeded scatter, building moves, validation, and rejection of invalid data. A Chromium browser smoke test covers full map loading, editing, history, export, local draft reload and the link to the interior editor. The existing game regression suite must remain green.

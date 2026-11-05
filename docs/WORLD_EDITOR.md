# Field Signal World Editor v1

Open **https://thundercato.github.io/bunker-game/editor/** on a desktop or laptop. A Mac with a mouse or trackpad is the intended setup. Nothing needs installing. The editor is separate from the playable game.

## First edit

1. Choose **Survey hut 03** in the building list. The 37 exterior buildings are available, including two-storey houses and the railway station.
2. Select a cupboard in the view or the Objects list. **W / Move** gives translation arrows. **E / Rotate** gives rotation rings. **R / Scale** gives resize handles. Exact position, dimensions and rotation are in the Inspector.
3. Use **Top** for a floor-plan view. **Hide roof**, **Cutaway**, the floor filter and **Collisions** help expose the structure.
4. Choose **Walk test** or press Space. Use WASD or arrow keys; drag the view to look; hold Shift to move faster. Escape or Space returns to editing. The Doors open checkbox lets you test open or closed access.
5. Save a local draft and export the layout JSON. Use **Test in game** to open the actual Python/WebGL game with this building replaced by your layout.

Right-drag orbits, middle-drag pans and the mouse wheel zooms. F focuses the selection. Cmd/Ctrl+Z undoes; Shift+Cmd/Ctrl+Z redoes. Cmd/Ctrl+D duplicates unbound props. Delete removes unbound objects. G toggles snap; Cmd/Ctrl+S saves the local draft. Buttons provide the same main actions for a trackpad.

## Structure and furniture

The Add assets tab includes walls, complete doorway assemblies, window openings, floors, ceilings, stairs and lights, plus 31 existing licensed prop models with actual rendered thumbnails. You can click an asset to place it near the view centre, or drag it onto the floor. Props include tables, chairs, cupboards, drawers, bed frames, shelves, crates, lamps, electrical boxes and clutter.

Objects have bottom-centre positions in metres. For a floor, Y is its top surface. Stairs use WIDTH, total rise (HEIGHT) and DEPTH. Their high end points along local negative Z. Moving, rotating or resizing stairs automatically updates the opening in a floor above. Set the upper-floor Y to the stair bottom Y plus its rise. Do not cover the landing with furniture.

Wall and doorway geometry is generated from the same data as collision. A doorway's width and height must fit its wall section. The four wall-snap buttons align an object's bounding footprint just inside the building perimeter. Snap to floor uses the floor level below it. You can also put a small prop on a table by setting its Y to the table's top.

The lock prevents accidental transforms. Hide is an **editor-only visibility control**, not deletion from the game. Undo and redo retain up to 80 document states.

## Existing loot and missions

Searchable cupboards and tables carrying loose loot retain their original game IDs. These objects can move and use a different prop model, but cannot be deleted or duplicated. Their binding appears in the Inspector. Moving a bound cupboard updates the game search position and any mission destination pointing to that container. Moving a table updates its loose-loot surface. This prevents a visible cupboard and its invisible interaction point ending up in different places.

Newly placed props are **decorative**. This first editor does not create new loot tables, missions or enemy spawns. Added doorway assemblies without an existing door ID remain open in the actual game preview; the existing interactive doors retain their open/close actions.

## Drafts, exports and safe game preview

Valid edits autosave as a local draft for each building. Save draft is an explicit additional checkpoint. Export JSON produces a portable `Field-Signal-<building>-layout.json` file. Open JSON loads that format, not a campaign save. Invalid input, unknown models, duplicate IDs and missing protected bindings are rejected without overwriting the current document.

Browser storage is not a permanent backup. Export before clearing website data, moving to another computer or resetting a draft.

**The preview button checks the installed game runtime first.** It updates an older offline worker so that a stale game cannot accidentally ignore the preview flag. If updating fails, editing/export still works; reconnect and reload before testing. No campaign data is cleared.

**Test in game is not publishing.** It opens a separate preview URL, starts a fresh test campaign at the layout's start marker and uses separate saved-game, settings and journal storage. Enemies are disabled for layout inspection. Your normal Overgrowth campaign is not loaded or overwritten. You can walk, operate existing doors and search the moved containers using the real Python rules.

The preview link depends on data in the same browser. It is not a portable share link. Share the exported JSON instead. Send approved JSON files back to this development conversation for integration, review and a tested GitHub publication. There is no GitHub token in the editor and no automatic remote write.

## Layout checks

Run checks reports common problems: unsupported stairs, steep rises, blocked landings, blocked start positions, apparently floating props, props outside the building footprint and possible perimeter-wall gaps. Click a warning to select its object.

These are practical checks, not a proof of full accessibility. Use the walk test and actual-game preview before accepting a design.

## Scope and limits

V1 focuses on the 37 **exterior buildings**, not the underground refuge, caves, terrain, railway or military perimeter. The editor seeds a clean structural template from the current game footprint, storey information, partition walls, searchable containers and loot surfaces. It is **not a lossless import of every procedurally generated decoration in v11**. On preview, that building's older generated shell/decorations are replaced rather than layered behind the edited scene. Other buildings remain unchanged.

Building origins and footprints are fixed. This keeps the surrounding paths, terrain and world map stable. Roofs in v1 are editable ceiling/slab objects; the elaborate v11 external roof decorations are not retained in a replaced preview building. Arbitrary mesh editing, multi-selection grouping, free-form terrain, direct GitHub publishing and whole-world approval are future work, not hidden features.

## File format and implementation

`format: field-signal-layout`, `version: 1`, stable `buildingId`, fixed `origin`, fixed `bounds` and an `objects` array. Each object has a stable ID, type, name, position, dimensions, yaw, material and collision/lock settings. Optional existing interaction bindings are validated against `world.json`.

`layout-core.js` owns validation, collision pieces, stair openings, movement and world-data binding updates. `layout-renderer.js` renders those definitions in both editor and real-game preview. `layout-preview.js`, `world-layout.js` and the optional Python editor adapter connect the exported definition to the normal game. No renderer-generated UUID is used as a persistent object ID.

The existing Three.js r170 release, OrbitControls and TransformControls are MIT licensed, with the original licence retained. Asset licences remain those already in the game. Preview thumbnails are renders of those models, not new unlicensed artwork. The editor uses ordinary JSON import/download rather than depending on a browser-specific filesystem picker.

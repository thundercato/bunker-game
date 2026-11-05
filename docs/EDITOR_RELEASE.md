# World Editor 1.0.0: published and verified

Published 5 November 2026 alongside Field Signal: Overgrowth v11.

**Editor:** https://thundercato.github.io/bunker-game/editor/

**Normal game:** https://thundercato.github.io/bunker-game/

Release commit: `f1f37e06bda3ce0594bf6c56b26ca7f659dfb173`.

[GitHub verification, successful Pages deployment and public-site checks](https://github.com/thundercato/bunker-game/actions/runs/42025853722) all completed successfully. The public editor returned the current bootstrap, version metadata and dedicated `field-signal-overgrowth-v11-editor1.0.1` offline cache. The game remains Overgrowth 11.0.0 with additive World Editor metadata, not a renamed game release.

## Delivered scope

37 exterior building templates; 31 licensed prop models with rendered thumbnails; wall, window, doorway, floor, roof, stair and light assemblies; actual mouse transform gizmos and exact inspector values; perspective and overhead views; cutaway, dynamic floor filtering and collision overlay; floor/wall snapping; locking, local hide, duplicate/delete and undo/redo; local drafts; validated JSON import/export; walk testing; and an isolated actual-game preview.

Stair openings and collision derive from the same layout data used by the editor and game. Moving a bound cupboard updates its Python search position and mission marker. Moving and rotating a bound table updates its loose-item surface. Existing mission/container IDs are protected from deletion and duplication.

## Save and runtime safety

The preview uses separate campaign, settings and journal keys and disables enemies for layout inspection. Normal Overgrowth campaign data is not loaded or overwritten. The editor updates and checks an older service worker before loading the editor modules or enabling a game preview; it does not clear campaign or draft storage.

Save draft is local browser storage. Export JSON is the portable backup. Test in game is a local preview, not automatic publication to GitHub. A preview URL depends on the draft stored in that same browser. Share the exported JSON for reviewed integration into the published game.

## Verification completed

The final GitHub pre-publication job passed:

- 96 Python tests, including 9 editor-compiled-world integration cases.
- 54 shared-layout validation/collision tests, 15 client/audio tests and 18 atlas tests.
- 15 ordinary game/controller/offline browser scenarios.
- 35 inventory/model-inspector/atlas browser scenarios.
- 15 environment/doorway/stair/vehicle scenarios.
- 9 desktop mouse-gizmo, Command-Z/redo, snapping and reload-persistence scenarios.
- 31 editor import/export, real-game preview, moved-container and protected-save scenarios.

After deployment, the workflow tested the actual public URLs: all 13 game/offline checks and all 31 editor/isolated-preview checks passed. The editor checks include actual keyboard movement through the edited doorway, a Python search at the moved mission cupboard, and preservation of sentinel production campaign, settings and journal data.

Additional local checks passed for 9 Linux WebKit desktop-control scenarios and 4 old-service-worker upgrade/save-safety scenarios. These are automated desktop software-rendering tests, not tests on a physical Mac, iPhone, iPad or attached controller. Real-device performance still needs playtesting.

## Explicit limits

This is not a lossless importer of every procedurally generated v11 decoration. The first editor focuses on the 37 exterior buildings, not the underground refuge, caves, terrain, railway or military perimeter. Building origins and footprints stay fixed. Roofs are editable ceiling/slab assemblies rather than every decorative v11 roof model. New props are decorative; new missions, loot definitions and enemy spawns are not authored here. Added doorway assemblies without an existing game door ID remain open in the actual-game preview.

The public game continues using its approved layouts until exported designs are integrated, reviewed and published separately. Layout warnings identify common problems, not every possible accessibility error.

## Actual editor screenshots

[Editor overview](verification-editor/editor-overview.jpg) · [Two-storey plan and stair opening](verification-editor/two-storey-editor.jpg) · [Separate game preview](verification-editor/isolated-game-preview.jpg)

See [the full user guide](WORLD_EDITOR.md) and [editor roadmap](EDITOR_ROADMAP.md). Source and third-party licences remain in the repository. No GitHub credentials or font files are embedded in the editor.

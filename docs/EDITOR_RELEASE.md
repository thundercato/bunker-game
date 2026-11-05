# World Editor 1.0.0 release candidate

A separate desktop browser authoring tool for Field Signal: Overgrowth v11.

Intended address after verification: https://thundercato.github.io/bunker-game/editor/

## Delivered scope

37 exterior building templates; 31 licensed prop models with rendered thumbnails; wall, window, doorway, floor, roof, stair and light assemblies; real mouse transform gizmos and exact inspector values; top and perspective views; cutaway and collision overlay; floor/wall snapping; locking, local hide, duplicate/delete and undo/redo; local drafts; validated JSON import/export; walk testing; and an isolated actual-game preview. Stair openings and collision are derived from the same layout data in the editor and game.

Moving a bound cupboard updates its Python search position and mission marker. Moving and rotating a bound table updates its loose-item surface. Existing mission/container IDs are protected from deletion and duplication. The preview uses different campaign, settings and journal keys and disables enemies for layout inspection. The old offline worker is upgraded before preview is enabled, without clearing the normal campaign.

This is not a lossless importer of every procedurally generated v11 decoration. It does not yet edit the underground refuge/caves/terrain, resize the world's building footprints, author new missions or automatically publish designs to GitHub. New props are decorative. The main game changes only after reviewed integration, not when a draft is saved.

## Local verification completed

- 96 Python tests, including 9 actual editor-compiled-world integration cases.
- 54 shared layout/validation/collision tests; 15 client/audio and 18 atlas unit tests.
- 31 editor and actual-game preview browser checks.
- 9 Chromium desktop control checks, including a real mouse drag of the transform arrow, Command-Z/redo and a draft surviving reload.
- 9 Linux WebKit checks of the same desktop controls.
- 4 older-service-worker upgrade/saved-campaign safety checks.
- 15 ordinary game/controller/offline regression checks.

These are automated software-rendered desktop browser checks, not physical Mac, iPhone or controller tests. GitHub repeats the core/editor checks before publishing and verifies the public editor afterwards. Record successful publication and the exact workflow run here once complete.

See [the user guide](WORLD_EDITOR.md) and [editor roadmap](EDITOR_ROADMAP.md). Source and third-party licences are retained in the repository. No GitHub token or font files are embedded in the editor.

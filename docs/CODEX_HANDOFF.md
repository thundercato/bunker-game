# Field Signal: Codex handover

Prepared 6 November 2026. Implementation audit baseline: `d31f178a674ec16d730a7d13f59c7eb112eb24bc` on `main`. This handover records current code separately from the much larger approved roadmap. It does not release v12 or change game behaviour.

Continuation update: M0 is reproduced and measured in
[`EXECUTION_2026-11-06_M0.md`](EXECUTION_2026-11-06_M0.md). The first M1 slice is a
tested world document/compiler with a bounded Survey hut isolated game preview,
described in [`WORLD_DOCUMENT.md`](WORLD_DOCUMENT.md). Normal play remains v11;
other building moves and terrain/roads/water remain authoring-only. The historical
audit below predates this adapter; use the latest NEXT_STEPS checkpoint to continue.

## What Adam is trying to build

An atmospheric, gritty, Eastern European-inspired first-person survival/exploration game, initially playable on iPhone/iPad from a browser and Home Screen. Inspiration is mechanical and atmospheric, not permission to copy proprietary game assets. The base should feel like a refuge: retain the calmer Relay Lanterns music. The desktop browser editor is a first-class product, aimed at a Mac with a mouse/keyboard, with Windows compatibility desirable.

Adam's immediate priority is a usable editor that can fix real building layouts, wall gaps, stairs, furniture and the surrounding map. He wants one-sided floor/wall resizing, an integrated exterior/interior workflow, terrain sculpting and natural brush placement. Later systems include richer loot, visual missions, safe relay stations, surges, saving and fatigue. Build reliable foundations rather than accumulating more unconnected features.

## Repository and links

- Repository: https://github.com/thundercato/bunker-game
- Playable game: https://thundercato.github.io/bunker-game/
- Building editor: https://thundercato.github.io/bunker-game/editor/
- Full-map editor foundation: https://thundercato.github.io/bunker-game/editor/world.html
- Controller diagnostics: https://thundercato.github.io/bunker-game/controller.html

The historical Bunker Game was retired. Do not restore its old Godot/pixel-art branches over Field Signal. Older source ZIP/import pointers are recovery history, not a reason to overwrite newer `main`.

## Verified implementation state

| Area | State at the audit baseline |
| --- | --- |
| Game | Overgrowth v11; Three.js rendering, Pyodide worker gameplay, static Pages hosting. |
| Content | README records 37 exterior buildings, 139 search containers, 35 creatures, 15 progressive assignments and 61 inspectable item types. Recount if modifying content. |
| Existing game features | Inventory/model inspection, zoomable Atlas and mission shortcuts, weather, day/time progression, weapon handling/maintenance, torch/knife, enemies, anomaly fields, storage, trading, calmer base score and offline support. |
| Building editor v1 | 37 templates, 31 library props, structural assemblies, exact transforms, gizmos, snapping, undo, cutaway, validation, JSON import/export, walk test and isolated actual-game preview. |
| Building-editor limits | Not a lossless import of every generated v11 decoration. Fixed source footprints/origins; underground refuge and whole terrain are not covered. Added props are decorative unless an existing interaction binding is retained. |
| Full-map editor v2 foundation | 600 x 850 m overview, 12 m terrain grid, raise/lower/smooth/flatten, seeded foliage markers, building placements, road/rail nodes, water circles/global level, layers/regions, local drafts and JSON. |
| Critical v2 limit | Uses simple authoring proxies. Its drafts do NOT yet alter the game terrain, buildings, collision, water damage or mission positions. Roads do not yet generate complete cut/fill/bridge structures. |
| Upcoming design | Detailed in the decision register. Anomaly surges, the new checkpoint rules, APR fuse stations, incubation death sequence, rest collapse, weighted per-container loot and a general visual mission graph are planned, not assumed shipped. |

The v2 editor already exists: do not spend a task rebuilding its toolbar from scratch. Its missing runtime integration is the important engineering work.

## Architecture map

- `site/app.js`: game UI, startup, render/simulation orchestration, inventory, missions, Atlas, saves and preview separation.
- `site/world-core.js`, `site/world.js`, `site/world-v6.js` through `site/world-v11.js`, `site/world-layout.js`: successive scene/rendering layers. Inspect the actual import/inheritance graph before refactoring.
- `site/engine.py`: deterministic rules, inventory, seeded loot, missions, enemies, death, persistence and optional editor adapter.
- `site/bridge.js`, `site/sim-worker.js`: message boundary to a worker that loads vendored Pyodide, the Python rules and a world override when supplied. The browser renders in JavaScript, not Python.
- `site/terrain.js`: terrain/surface rules and local layout integration.
- `site/world.json`: existing content IDs, buildings, terrain-related definitions, containers, items, missions and sources.
- `site/layout-core.js`, `site/layout-renderer.js`, `site/layout-preview.js`: v1 layout validation, geometry/collision, scene rendering and explicit isolated preview.
- `site/editor/editor.js`: the interior authoring UI. `bootstrap.js` handles safe runtime/cache startup.
- `site/editor/world-core.js`, `site/editor/world.js`, `site/editor/world.html`: the v2 world draft schema and spatial UI. The core currently uses format `field-signal-world/2`, `cell:12` and fixed source bounds.
- `site/asset-library.js`, `site/item-models.js`, `site/item-studio.js`, `site/atlas-core.js`, `site/atlas.js`: asset loading, item preview/inspection and navigation.
- `site/controller-core.js`, `site/input.js`, `site/input-v8.js`, `site/haptics.js`: device detection, mappings, diagnostics and best-effort haptics.
- `site/audio*.js`, `site/audio-bank.json`: soundscapes and audio data. Preserve existing track/volume behaviours unless specifically changing them.
- `site/assets/`, `site/V*_CREDITS.md`: runtime assets, manifests and licensing. Do not assume all art is CC0; there are attribution requirements.
- `site/sw.js`, `site/precache.json`: offline/cache versioning. A stale worker can make a new editor launch an old game, so test upgrades.
- `tools/build.py`: validates and emits self-contained `dist/`.
- `.github/workflows/deploy-pages.yml`: CI, Pages deployment and public-site checks. Current toolchain is Python 3.12, Node 22 and Playwright 1.56.1.

## Persistence that must survive

The current game uses campaign schema 9 and the normal save key `field-signal-dead-air-v9`, despite being a v11 game. Do not infer a save schema from the product version. Building drafts use their own format and storage; preview saves/settings/journal are separate. Inspect the current names in code rather than guessing.

The newly designed safe-zone-only checkpoint model is NOT justification to remove the existing save mechanism in an unrelated editor PR. It needs migration, write-failure recovery, clear user messaging and regression tests. The fact that a game is offline/single-player does not make data loss acceptable.

## First useful Codex task

Follow milestone M0 in `NEXT_STEPS.md`: reproduce the baseline, measure representative scenes and create an editor-to-game integration plan with explicit status. Then implement one bounded slice, not the entire roadmap. Recommended first slice: a versioned world document/compiler and one moved/rotated building with its existing v1 interior, search points, doors, mission target and terrain/floor sampling all agreeing in an isolated game preview. Keep the normal release unchanged until review.

## Do not accidentally reinvent decisions

The latest decisions, including corrections to earlier suggestions, are in `DESIGN_DECISIONS_2026-11-06.md`. Notably: missions are voluntarily accepted; abandonment follows failure logic; loot is bounded weighted draws with per-item duplicate rules; ordinary death and a surge are different; only powered safe zones protect; cryo chambers save but do not heal; automatic entry/exit/death saves supplement manual saving; and the complete next-generation mechanics are not all implemented.

Unsettled details are not blockers for the entire project. Ask a single question only when needed for the current slice. Do not repeatedly ask Adam to approve the already-selected terrain, water and building workflow recommendations.

## Verification honesty

Historical tests and screenshots are in existing release/verification documents. They are evidence for those commits, not a guarantee about a new task. Record fresh results for each change. This handover is a documentation audit, not a new end-to-end playtest. Physical iPhone/iPad, wired controller behaviour and sustained mobile performance remain device-test responsibilities.

Companion documents: `CODEX_CLOUD_SETUP.md`, `CODEX_START_PROMPT.md`, `NEXT_STEPS.md`, `ARCHITECTURE_REVIEW.md`, `WORLD_EDITOR.md`, `WORLD_EDITOR_V2.md` and the release history.

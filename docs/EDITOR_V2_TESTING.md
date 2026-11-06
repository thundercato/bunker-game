# Review and test the canonical editor

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
python3 tools/build.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/editor/` and use World, Loot, Missions and Validation.
Use **Prepare editor for offline** and wait for **Editor ready offline** before
disconnecting. **Recover editor backups** lists original editor bytes and offers
validated restores; malformed originals remain downloadable and cannot be applied.
This is the normal production package; **no review overlay is needed**. Tests run
that same dist under `/bunker-game/`. A successful PR CI run also offers the
`canonical-editor-dist` download; extract it and serve it as above. No deployment
or publication is implied. See `EDITOR_V2_PROGRESS.md` for actual status/results.

## Practical journeys

1. Select a floor, enter 37° yaw, choose its numeric anchor, extend width and drag
   Resize edges/corner handles. Observe fixed opposite anchor, collision view,
   exact local offsets, Escape, undo/redo and layout export/reload. Y drags need 3D.
2. Edit a hut container, click Full World Map, move/rotate/raise its complete parent,
   open its actual in-world cutaway and edit a child's local coordinate. Return
   to focused view: contents, selection, camera and shared undo/redo remain. Repeat
   with Forester's cottage and the station. Export connected world JSON to retain
   all interiors and placements; old layout/world JSON imports remain supported.
3. In Interior workshop, snap a small prop to a rotated table/support, align selected
   children and rotate a collection about its selected pivot. Capture an unbound
   decorative template and instantiate with explicit material/scale overrides.
   Existing gameplay bindings/doors/start markers cannot be copied. Inspect overlaps,
   focus a room, join walls and add real stair landing floors. Clipped landings are
   rejected; shared top-transition warnings require actual-game verification.
4. In Model library inspect actual geometry, provenance and costs before placement.
   In Interactions/references follow actual container loot/mission links. Inspect the
   real refuge source map: rooms, radio/NPC offers, storage and vault transitions.
   It is read-only until a shared local-scene authoring contract exists.
5. On the world map choose foliage/rock, seed, spacing, scale/yaw and exclusion masks.
   Hover for candidates/rejections, paint, lock one instance, erase, cancel and undo.
   Export/reload does not reroll. Sculpting keeps the terrain buffer and updates local
   vertex/normal ranges during the gesture. A full refresh can still occur at transaction boundaries; large-document stress testing remains outstanding.
6. Loot and mission workspaces retain their actual source IDs and proposals. Use
   grouped overrides/bulk preview, weighted seeded simulation or typed graph editing;
   follow a target back to the existing world object. These proposals do not execute
   in the game. Unsupported mechanics remain disabled or explicitly labelled.
7. Run Validation for current coverage, support/headroom/access, references, water
   approaches and regional counts. Follow repair links, then rerun; changed drafts
   invalidate report export. Recovery errors are visible. Checks do not approve a
   release or replace walking the actual building.
8. Test in game retains the existing local-layout preview. Connected game preview is
   disabled in canonical main until its runtime adapter is accepted. To reproduce the
   tested **unmerged** adapter combination, follow the compatibility record below.

## Automated checks

```sh
python3 -m unittest discover -s site/tests -p 'test_*.py' -v
for f in site/tests/editor_v2_*.mjs; do node "$f"; done
node site/tests/test_client.mjs
node site/tests/test_atlas.mjs
node site/tests/test_layout.mjs
node site/tests/test_world_v2.mjs
node site/tests/test_world_document.mjs
python3 tools/build.py
for f in tests/editor_v2_*_browser.cjs; do node "$f"; done
node tests/editor_v2_offline.cjs
EDITOR_PRIOR_WORKER=editor21 node tests/editor_v2_offline.cjs
node tests/editor_controls.cjs
node tests/editor_browser.cjs
node tests/world_v2_browser.cjs
node tests/ci_smoke.cjs
node tests/fieldcraft_browser.cjs
node tests/overgrowth_browser.cjs
```

Run rendering suites sequentially. Every acceptance test serves canonical dist,
not source. Missing imports/data files fail before browser startup. Upgrade fixtures
include the published world2 worker and the previous editor review worker; all five
workspaces restart offline and preserve save/draft sentinels. Runtime previews have
separate campaign/settings/journal namespaces. Linux Chromium/SwiftShader is not
physical Mac/iPhone testing or a device benchmark.

## Explicit runtime compatibility build

[Exact tested revision, commands, fixtures and screenshots](EDITOR_V2_RUNTIME_COMPATIBILITY.md).
`tools/editor_v2_compatibility.py` creates a new detached runtime worktree, preserves
that runtime/compiler, and unions only explicit public editor paths. It neither
merges a draft PR nor produces an approved release. Never deploy this artifact.
Main tests verify that the optional adapter is unavailable without importing a
missing module or creating a fake preview. Actual-game compatibility is a separate
opt-in test, not a silent CI skip represented as gameplay support.

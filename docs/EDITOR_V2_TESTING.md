# Review the editor suite

This is an editor branch, not a deployed update. Read `EDITOR_V2_PROGRESS.md`
and `EDITOR_V2_INTEGRATION_REQUESTS.md` before release integration.

## Start a local review

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
python3 tools/editor_v2_review.py
python3 -m http.server 8000 --directory dist
```

The review script runs the canonical build, then copies editor HTML/JS/CSS into
its output. It does not alter the manifest or service worker. **Do not deploy this
output or merge before IR-01 packaging review.** The ordinary build alone omits
17 new editor files. Offline operation of the new suite is not accepted yet.

## Try the actual tools

1. Open `http://localhost:8000/editor/`. Select Ground floor. Enter 37° rotation.
   Choose **Keep negative edge · extend positive**. Change width by an exact metre:
   only the positive local edge moves. Choose **Resize edges**, drag X+ or a
   corner; the green opposite anchor stays fixed. Escape cancels. Undo/redo
   restores both size and position. Export, import and reload the layout.
2. Use **Object local** axes or the relative local offset fields. Focus frames
   the selection; Top gives plan view. Numeric inputs retain unsnapped precision;
   mouse handles use the selected dimension snap. Y edge drags need a 3D view.
   Toggle collisions; stairs still generate floor openings from shared definitions.
3. Expand **Selection sets · bulk tools**. Filter walls, select shown, store a
   named collection; apply a building-local offset as one undo step. Try lock,
   hide, isolate and reveal. Collections export separately as editor metadata.
4. Open **Model library** in the left footer. Search `kirill table`, inspect the
   actual model, drag to orbit, check source/licence/cost, then place decoration.
   Inspection-only models cannot be placed without reviewed dimensions.
5. Open `/editor/world.html`. Use hierarchy search and regions. Focus a building,
   drag with snap, cancel with Escape, lock and retry. Edit yaw in degrees or
   manual foundation height. Paint foliage, select and lock an instance; sculpt
   beneath it. Edit curved path points/width or a local water circle. World
   visuals remain authoring proxies and do not change the playable world.
6. Open `/editor/loot.html`. Select a real container, explicitly suggest weights
   from legacy data, edit draws/entries, choose inherited default or local override,
   preview a bulk change, undo it and simulate with a seed. First-draw probabilities
   differ from estimated overall inclusion. Export a proposal; no game loot changes.
7. Open `/editor/missions.html`. Filter an actual source/mission, follow its real
   object link, drag graph nodes, connect typed ports or use the form alternative,
   edit prerequisites/policies/reward proposals, validate, undo and export. These
   graphs do not run in preview; unsupported node kinds are disabled.
8. The existing **Test in game** button opens the v1 building-layout preview in
   isolated state. World placement preview is PR #81's separate integration.
   No button in this suite publishes to the live game.

## Automated checks

```sh
python3 -m unittest discover -s site/tests -p 'test_*.py' -v
for f in site/tests/editor_v2_*.mjs; do node "$f"; done
python3 tools/editor_v2_review.py
for f in tests/editor_v2_*_browser.cjs; do node "$f"; done
node tests/editor_controls.cjs
node tests/editor_browser.cjs
node tests/world_v2_browser.cjs
node tests/ci_smoke.cjs
node tests/fieldcraft_browser.cjs
node tests/overgrowth_browser.cjs
```

Run rendering suites sequentially. Asset/loot/mission dedicated browser tests serve
source directly; resize/hierarchy/world and existing regressions use the review
build. Tests use separate local origins/profiles and preserve production sentinels.
Logs and screenshots: `test-results/editor-v2/`; reviewed evidence is committed in
`docs/verification-editor-v2/`. Linux Chromium/SwiftShader is neither physical Apple
testing nor a device performance measurement. See progress for exact executed results.

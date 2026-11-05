# Field Signal: Overgrowth v11

A landscape first-person survival game for iPhone, iPad, keyboard and controller. Python gameplay rules run locally through Pyodide; Three.js renders the world. The repository is the persistent source of truth.

## Play

**https://thundercato.github.io/bunker-game/**

Open in Safari in landscape. The preflight title should say **Overgrowth v11**. Choose **Load the game**, then **Enter with sound**. Controller Clinic remains at `controller.html` on the same site.

## V11: the environmental pass

The playable world is retained, but its most visible exterior elements are rebuilt:

- Two fuller, irregular game-ready pine variants with detailed branches and bark. Nearby trees use real meshes. More distant trees use pre-rendered representations of those same meshes, rather than applying the enormous source geometry to thousands of trees. Visibility and detail are bounded by the quality preset.
- All eight searchable vehicles now use damaged SUV or covered-car models. Their original loot IDs and collision footprints remain. An invisible interaction volume makes broken windows and missing panels usable rather than forcing the player to hit a tiny remaining triangle.
- All 37 buildings have a roof/exterior pass: pitched roofs, the hangar’s arched roof, window modules, entrance canopies, chimneys and weathered materials. Existing interiors, entrances and stairs remain in their original locations.
- Scanned mossy rocks, stumps, deadwood and ferns supplement the forest floor. These are drawn in bounded nearby batches rather than all at once.
- Nine new model definitions replace two of the earlier stretched exterior-kit usages. The loaded library contains 58 families, including the two baked procedural pine variants. It is not 58 newly downloaded scans.
- Five surface sets provide colour, normal and roughness maps for timber, cracked plaster, masonry, tiles and corrugated metal.

The pines were baked using MIT-licensed EZ-Tree. Poly Haven supplies the CC0 scanned environment pieces and materials. The damaged SUV is a CC BY 4.0 model by Rashad Ibrahimli and has explicit attribution. See `site/V11_CREDITS.md` and `site/assets/v11/models.json` for exact origins and changes.

Buildings are a combination of imported facade modules, textured roof geometry and preserved authored collision/interior shells. They are not sealed exterior scans being described as walkable houses. Some gameplay and interior props remain authored geometry.

## Your campaign and features are retained

The build remains a browser game. Campaign schema **9** and localStorage key **field-signal-dead-air-v9** are unchanged. V9/v10 saves at this same address continue automatically. Import/export remains available for older supported campaigns. Export before clearing website data.

The game still has 15 progressive radio/NPC missions, 61 inspectable item types, 139 search containers, 35 enemies, a zoomable full-screen Atlas, mission shortcuts, the calmer **Relay Lanterns** refuge score, radio stations, continuous time, weather, hidden anomalies, weapon handling, cleaning, personal storage and an underground refuge.

Atlas: drag or pinch, use the zoom buttons, **Centre on me**, or **Objective**. The **Mission** shortcut opens the pinned dossier. Item images open a read-only rotate/zoom model viewer.

## Performance and offline use

Choose **Pause → Display, comfort & diagnostics** for Battery saver, Balanced or Sharper. Sharper raises the nearby detailed-tree budget; it does not load a completely different campaign. The first load after updating is larger than later cached loads. Wait for Saves & offline to report that all runtime files are ready.

No physical iPhone/iPad performance or controller compatibility is claimed from software-rendered browser tests. Keep a campaign export and report any particular trouble spot with its map location and quality setting.

## Development

```sh
python3 tools/build.py
python3 -m http.server 8000 --directory dist
```

```sh
python3 -m unittest discover -s site/tests -p 'test_*.py' -v
node site/tests/test_client.mjs
node site/tests/test_atlas.mjs
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
node tests/ci_smoke.cjs
node tests/fieldcraft_browser.cjs
node tests/overgrowth_browser.cjs
```

The GitHub workflow repeats verification before deploying main and then tests the actual public site. `site/world-v11.js` contains the environmental layer; the deterministic Python rules are unchanged. `site/assets/v11` contains runtime models, distant tree images, materials and provenance. Raw huge masters, test-browser installations, fonts and unrelated downloaded scenes are excluded.

## What comes next

See `docs/ROADMAP.md`. A native-app evaluation is explicitly deferred until after this web release has device feedback. It must preserve the game’s progress and be judged with a representative forest, house, creature and inventory scene, rather than choosing a platform solely because its wrapper is native.

# Field Signal: Fieldcraft v10

A landscape browser survival game for iPhone, iPad, keyboard and controller. Python gameplay rules run locally through Pyodide; Three.js renders the first-person world. No PC server or account is needed to play.

## Play

**https://thundercato.github.io/bunker-game/**

Open in Safari, use landscape, choose **Load the game**, then **Enter with sound**. The opening screen should say **Fieldcraft v10**. Controller Clinic is at **https://thundercato.github.io/bunker-game/controller.html**.

This repository is the source of truth. Its former Bunker Game project remains on `archive/retired-bunker-before-field-signal`; Field Signal now occupies `main`.

## New in Fieldcraft

- 25 additional CC0 model families, bringing the loaded imported collection to 51 families. Real replacements cover 53 tables, 131 searchable furniture units, 14 bed frames and 126 architectural details, plus exterior dressing. Existing collision shells, mission targets and loot rules are retained.
- All 61 catalogue items have a rendered model image in backpack, loot, storage and trading lists. Tap an image to rotate and zoom its model without consuming, equipping, dropping or buying it.
- A read-only Equipment catalogue lets you inspect items by category. It does not grant items or bypass progression.
- A full-screen **Atlas** with touch drag/pinch, zoom buttons, wheel zoom, region selection, a scale bar, player centring and objective centring. It uses an ordinary page panel, not native browser fullscreen.
- A persistent **Mission** shortcut, clickable objective title and **View target on map** from the dossier. After recovery, the objective points back to the correct contact, not the original loot location.
- Optimised static thumbnails: inventory grids do not create WebGL contexts per slot. One shared additional renderer is created only when inspecting an object.

## What is retained

The v9 region has 37 buildings, 139 searchable containers including vehicles, 35 creatures and 15 progressive radio/NPC assignments. It includes classified dossiers and completion history; continuous 1× base and 12× field time; hidden probe-revealed anomaly fields; riflemen, mist creatures and skitters; bridges, caves, underground stores, a garrison and sewer routes; vault transitions; weather; weapon maintenance; magazines and chambering; knives and torches; survival needs, personal storage and configurable loot probabilities.

The calmer **Relay Lanterns** refuge score remains. Field music, spatial ambience and the separately controlled radio are preserved.

## Saves

V10 deliberately retains the version-9 campaign schema and the same `field-signal-dead-air-v9` localStorage key. An existing v9 save at this same GitHub Pages address should continue automatically. V6–v8 exports can still be imported using the tested migration. Older temporary-site saves require manual export/import because browser storage is origin-specific. Keep an exported backup before changing browser/site data.

## Development

```sh
python3 tools/build.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000` for a local desktop check. For mobile installation, service workers and controller testing, use the HTTPS deployment. Runtime assets are local to the site; there are no expiring model or audio dependencies.

```sh
python3 -m unittest discover -s site/tests -p 'test_*.py' -v
node site/tests/test_client.mjs
node site/tests/test_atlas.mjs
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
node tests/ci_smoke.cjs
node tests/fieldcraft_browser.cjs
```

The GitHub workflow runs these checks before publishing main. Browser tests mount the build under `/bunker-game/`, not only at a server root. The separate WebKit test is available in `tests/webkit_fieldcraft.cjs` when that browser is installed.

## Main code

- `site/engine.py`, `site/world.json`: Python survival, inventory, missions and world data.
- `site/world-v10.js`: imported furniture and architectural details layered onto the existing tested world.
- `site/item-models.js`, `site/item-studio.js`: complete item visual registry and one reusable inspection renderer.
- `site/atlas-core.js`, `site/atlas.js`: testable map maths, mission destinations and map gestures.
- `site/app.js`, `site/fieldcraft.css`: user interface and controls.
- `site/controller-core.js`, `site/controller.html`: independent raw-input diagnostics.
- `site/assets/v10`: local GLBs, provenance and actual model-rendered thumbnails.
- `tools/build.py`, `.github/workflows/deploy-pages.yml`: validation and deployment.

## Credits and limits

**Powered by Poly Haven.** Imported assets are individually credited in `site/V10_CREDITS.md` and the versioned manifests. Some familiar equipment labels use representative models rather than exact replicas. Of the 61 item visuals, 25 definitions use imported meshes and 36 use original authored geometry. Buildings retain authored structural shells with imported cladding and details. This is not a claim that every object or entire building is an externally sourced scan.

Physical iPhone/iPad/controller performance still needs user playtesting. Automated browser tests, including Linux WebKit, are not a substitute for testing a specific iOS accessory. See `docs/ROADMAP.md`, `docs/PLAYER_GUIDE.md` and `docs/TEST_REPORT_V10.md`.

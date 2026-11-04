# Field Signal: Dead Air

**Version 9.0.0** · A first-person survival game for iPhone, iPad and desktop browsers.

**Play:** https://thundercato.github.io/bunker-game/  
**Controller Clinic:** https://thundercato.github.io/bunker-game/controller.html

The repository name remains `bunker-game` for convenience. Its retired Godot/Phaser project is no longer the active game. That earlier project is preserved on `archive/retired-bunker-before-field-signal`.

## What is here

Field Signal is a single-player, atmospheric survival prototype. Explore a misty coastal forest, prepare equipment in an underground refuge, search physical cupboards, recover mission objects and return safely. **Python owns the game rules** and runs locally through the bundled Pyodide WebAssembly runtime. **Three.js renders the 3D world**. A small JavaScript interface handles touch, gamepads, sound and the browser's local saves.

No account, server-side Python process, paid API, AI generation service or external asset CDN is required to play. All runtime models, textures, music and Python files are in this repository. The first complete offline download is approximately 48 MB before HTTP compression.

## Version 9 highlights

- **Calmer base score:** *Relay Lanterns*, an original 128-second composition using soft sustained chords and sparse electric-piano notes. No percussion or threatening sub-bass. Field music stays eerie. The refuge drone is reduced separately.
- **15 classified mission dossiers:** photographs of the actual destinations, a game-coordinate map with a red pen-style target circle, clear objectives and rewards. The first assignment opens two radio choices. NPCs offer their own side jobs. Completed operations leave the live board and remain in an archive with completion times and played duration.
- **Continuous time:** the base runs at 1:1; the field at 12:1. Standing still does not stop enemies or survival. Menus, backgrounding and controller-disconnection pause do stop the simulation.
- **Expanded world:** a 600 by 850 game-unit region, 37 buildings, 139 searchable containers and 35 creatures. Road and railway bridges cross the river. Foggy western mountains, a recoverable southern bog, transmission infrastructure, a fortified garrison, a rear breach and three sewer entrances provide new routes.
- **Underground refuge:** unlock a heavy vault door, walk along the stairs, then transition with a closing-door sound and brief blackout. Return by the same physical route.
- **Combat feedback:** muzzle flash, temporary surface impacts, white mist-creature hit flashes, swinging/reversible knife, brighter torch modes, and optional capability-tested phone/controller haptics.
- **Riflemen:** humanoid mist enemies reposition quickly, crouch and fire, with a maximum 50% close-range hit probability. Doors, windows, facing, darkness and torch use affect perception. The simulation is not a full tactical navigation system.
- **Hidden anomaly fields:** no warning signs or map markers. The detector warns of interference; a probe reveals the field and its artefact. Visibility resets when you return to base. Revealing a hazard does not make it safe.
- **Equipment and radio:** licensed pistol, magazine, knife, flashlight, signal-light and rifle meshes. The music receiver is now an AM/FM-style boombox, not the task transceiver. Three licensed radio recordings cycle with positional crackle.

The earlier game features remain: weapon magazines and chambers, safety and jams, touch cleaning, editable per-item loot probabilities, personal storage, clothing, hunger/thirst/stamina, weather, a firing range, caves, upstairs rooms, maps, waypoints, journal and photo view.

## Start playing

Open the play link directly in Safari in landscape. The launch screen checks controller input **before loading the 3D engine**. Tap **Load the game**, wait for Ready, then choose **Enter with sound** or **Enter silently**.

You begin in your quarters. Follow the amber floor line to maintenance, take the PM from the bench and search the supply locker. In the weapon panel, insert a magazine, rack the slide and turn the safety off. Your first assignment is **First signal**. The task radio is at the end of the corridor; the music receiver is in the bar.

Standard controls: left stick move; right stick look; A use; LT aim; RT fire; X magazine; RB rack; Y backpack; View map; R3 short jump. Buttons and axes can be remapped. Keyboard: WASD move, drag to look, E use, X fire, R magazine, C rack, V secondary tool/safety, B pack, M map, Q probe, G detector, Space jump, Escape pause.

## Controller and haptic limitations

The independent Controller Clinic displays the actual browser-exposed device, axes, buttons and focus state. It can export or share a diagnostic file without uploading it automatically. It cannot make iOS expose an unsupported or withheld device. A successful haptic API call is not proof that the hardware physically vibrated.

Chromium and a Linux WebKit browser were used during development. **Physical iPhone/iPad hardware, mobile Safari frame rates and the owner's actual wired controller remain unverified.** Do not treat simulated controller tests as device certification.

## Saves and updates

Saves stay in the browser on that device, not in a cloud account. Export through **Pause → Saves & offline**. This build imports v6, v7 and v8 campaign backups and upgrades them to the v9 schema. Earlier completed missions without timestamps are honestly marked as legacy records. V5 recovery saves are not silently converted.

A different website address has different browser storage. To bring progress from the temporary host, export there and import here. Keep an exported backup before clearing Safari data. Offline mode is ready only when the in-game status confirms the complete asset download.

GitHub Pages replaces the expiring temporary host. A failed development session no longer needs to lose the source: this repository and its commits are the source of truth. Uncommitted sandbox changes are still temporary, so future work must use frequent checkpoints.

## Repository layout

| Path | Purpose |
|---|---|
| `site/engine.py` | Deterministic Python simulation, inventory, AI, missions and save validation |
| `site/world.json` | Map content, buildings, containers, missions, loot profiles and equipment catalogue |
| `site/world-v9.js` | Expanded geometry, equipment meshes, vaults and combat feedback |
| `site/world-v8.js` and earlier modules | Preserved rendering foundation, collision and scene systems |
| `site/app.js` | Browser UI, dossiers, input routing and simulation scheduling |
| `site/controller-core.js`, `controller.html` | Independent native-controller diagnostics |
| `site/audio*.js`, `audio-bank.json` | Sound mixing, calm base score, ambience and radio |
| `site/haptics.js` | Optional real phone/gamepad vibration requests |
| `site/assets/`, `site/vendor/` | Self-contained licensed assets and Python/browser dependencies |
| `site/tests/` | Active portable Python and JavaScript unit tests |
| `tests/ci_smoke.cjs` | Real-browser verification under the `/bunker-game/` URL path |
| `tools/build.py` | Validated static-site build into `dist/` |
| `docs/` | Player guide, roadmap, design decisions and test limitations |

The renderer still contains layered version modules. That is deliberate recovery compatibility, not the desired final architecture. Modularising these layers is a roadmap item rather than a risky rewrite before release.

## Development

Requires Python 3.12 and Node.js 22 for the documented build/test environment. No pip packages are needed for the gameplay tests or static build.

```sh
python3 -m unittest discover -s site/tests -p 'test_*.py' -v
node site/tests/test_client.mjs
python3 tools/build.py
python3 -m http.server 8000 --directory dist
```

For the browser integration suite:

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
node tests/ci_smoke.cjs
```

`ci_smoke.cjs` serves the game under `/bunker-game/`, runs the actual Python worker and WebGL scene, tests controller routing, a mission dossier, audio decoding, migration and offline reloading, and writes `test-results/`.

## Publishing workflow

A push to `main` runs Python and JavaScript checks, builds the site, runs browser verification, then deploys the tested artifact to GitHub Pages. Pull requests run verification without publishing. Do not bypass a failed check merely to produce a link.

The one-off checkpoint importer is limited to the `field-signal-v9` development branch. It verifies a pinned SHA-256 before importing a source ZIP and rejects traversal paths, symlinks and repository-control files. It is a migration mechanism, not a runtime dependency. Normal future edits can be committed directly to a feature branch.

## Credits and licences

See `site/V7_CREDITS.md`, `site/V8_CREDITS.md` and `site/V9_CREDITS.md`. Imported 3D assets are mostly CC0, while software dependencies retain their MIT/MPL and bundled notices. The original score and authored game code are separate from those third-party licences. The repository does not make an unrequested blanket licence grant over all original code.

No Into the Radius/STALKER game files, paid stock assets, font binaries, account tokens or personal cloud credentials are included. Mission dossier photos are rendered game screenshots, not newly generated AI concept art.

### Editing packed assets

`python3 tools/unpack_assets.py --output unpacked-assets` recovers ordinary GLB models and MP3 recordings from the local banks without an external download. Preserve each asset's original licence when editing or reusing it. The build keeps runtime banks to reduce request overhead, not to hide the source.

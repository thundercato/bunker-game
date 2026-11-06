# Playable building-preview update

Scope authorised by the follow-up request to make the new version and provide a
play link. PR #80 passed verification and was merged as `24de65a`. Feature branch
`feat/moved-building-preview` starts there; adapter commit `00e75d0` connects the
versioned document to the existing actual-game preview. No engine replacement.

## What is playable

After deployment, open:

https://thundercato.github.io/bunker-game/?buildingPreview=hut&play=1

Choose sound or Silent. You start outside the moved hut, facing its entrance.
Use E/controller Use/touch Use to open the door. Walk in, approach the drawers,
search for the recorder and open Atlas → Objective. This is the real Overgrowth
game/Python worker with an isolated test campaign. It is not an art mock-up.

The example moves Survey hut 03 to `(35,-48)` and rotates it 90°. In the full-map
editor, select Survey hut 03, adjust X/Z/yaw and use **Test Survey hut in game**.
Its saved v1 interior is adopted, including existing bindings. Manual foundations
use Y; raised previews have a visible support apron. The browser test uses a
1.25 m foundation, a locally moved cupboard and an added chair to verify composition.

Normal game remains Overgrowth 11.0.0; editor update is 2.1.0-preview; release build
is `overgrowth-11.0.0-building-preview-1-20261106`. Save schema remains 9. Normal
campaign/settings/journal are separate from both old layout and new world previews.
Reopening the fixed play link continues its own preview save; a new editor test
creates a new preview UUID. No ordinary save or draft key was renamed/deleted.

## Important corrections and boundaries

- Previous v1 browser verification protected a v8 journal key, while `app.js`
  actually used `field-signal-v9-journal`. Preview reads/writes now use their own
  journal namespace, and both old/new preview browser tests protect the real key.
- Moved buildings no longer leave their source shell, partition walls, doors or
  procedural upstairs floor behind. JavaScript and Python share the compiled
  transform and preserve container, loose-surface and mission IDs.
- Sight lines also test the moved layout when both endpoints lie outside it.
- Source byte digest and reviewed revision are checked before preview application.
  Invalid drafts/assets/placements fail before campaign startup. No scripts are
  executed from imported JSON.
- Old service workers update before importing game/editor modules. A test installs
  the real previous worker and poisons its cached `app.js` to catch stale imports.
  Entry scripts use network-first/offline-cache fallback for later upgrades.
  Browsers that decline worker registration can still play online when no older
  worker controls the page; an existing stale worker must update before play.
- Terrain, roads, water, foliage, other building placements, refuge editing and the
  broader v12 mechanics remain outside this release. The UI states the boundary.
- River/swamp/out-of-bounds/overlapping building placements and foundations outside
  0–8 m are rejected for this preview. Full terrain/foundation integration is future
  work. Preview enemies are disabled as in the existing layout test campaign.

## Verification and evidence

Linux x86_64, Python 3.12.14; pure JS verified with Node 22.23.4. Browser runner:
Node 24.22.1, Playwright 1.56.1, Chromium 141/SwiftShader. These are not physical
iPhone/Mac/controller tests or hardware frame-rate measurements.

- Python discovery: **107 passed**, including 11 new JS-compiled Python preview
  checks. Upstairs/stair samples are compared directly against JavaScript results.
- Pure JS: **15 client, 18 Atlas, 54 layout, 57 world-document** checks passed;
  v2 aggregate and new preview-adapter aggregate passed.
- JS syntax, `git diff --check` and `python3 tools/build.py` passed. Build emits
  **280** self-contained files; content stays at 15 missions, 139 containers,
  35 enemies and 61 inspectable item visuals.
- New `world_preview_browser.cjs`: **15 checks passed**. Actual editor inputs,
  rotated/raised movement, door Use, furniture/cupboard transform, physical search,
  Atlas target, actual v9 sentinels, separate journal, old-worker upgrade, offline
  restart without reroll, exact draft return and fresh-context shareable link.

Existing browser suites and final release state are recorded in the closing
checkpoint below. The same new browser runner accepts `GAME_URL` and is included
in both PR verification and the post-deployment public-site job.

The six existing local browser commands all exited 0: `ci_smoke.cjs`,
`fieldcraft_browser.cjs`, `overgrowth_browser.cjs`, `editor_controls.cjs`,
`editor_browser.cjs` and `world_v2_browser.cjs`. The v1 preview runner now protects
the actual v9 journal as well as its historical v8 sentinel. Local logs are in
`verification/2026-11-06-building-preview/local-tests.txt`.

Screenshots/results: [verification folder](verification/2026-11-06-building-preview/).
See [WORLD_DOCUMENT.md](WORLD_DOCUMENT.md) for the contract and remaining work.

## Closing checkpoint

Review/release: [PR #81](https://github.com/thundercato/bunker-game/pull/81).
Implementation commits: `00e75d0` (runtime adapter), `f6cb52a` (browser/release
verification), `2736e3f` (historical worker fixture for shallow CI).
All seven local browser suites passed; the final network-first entry/offline
rerun also passed all 15 checks. CI and publication are tracked on that PR and the
repository's Pages workflow; deployment must match release build
`overgrowth-11.0.0-building-preview-1-20261106`, not merely the older version string.
The task's final response will give the play link only after public verification.

Concurrent game-first documentation through `0de93ec` was merged without removing
its new requirements. See `MEGA_BUILD_PROGRESS.md`: next coding work is the actual
world audit/flagship region and journal slices, not repeating the M1 adapter.
Full-map terrain/roads/water and M2–M6 remain undelivered; target-device review is
still needed. This bounded playable preview does not claim that overhaul is done.

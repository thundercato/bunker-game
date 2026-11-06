# Game-first candidate execution checkpoint, 6 November 2026

Candidate PR: https://github.com/thundercato/bunker-game/pull/83 . Branch:
`feat/game-first-candidate`, stacked on draft PR #81. Main was safely refreshed
through docs-only `be64a7f`; its parallel editor brief is retained. Neither feature
PR has been merged or published. Public play remains Overgrowth v11.

## What is playable

The existing game now has eight authored district scene sets, four refurnished
homes, 69 searchable catalogue variants (68 actually placed), and143 searchable
containers including the original139 IDs. Its new physical notebook opens from
HUD/Pack/N/controller and shows actual assignments, outcomes, encountered records,
communications and notes. The3D paper turns; Battery saver/reduced motion have a
readable2D mode. Mission actions open the existing Atlas/dossier or pin the target.

The scene sets add woodland boulders/deadwood/ferns, village gardens/fences/lamps,
railway ballast/signals/wagons, utility cabling, refuge services, cargo stacks and
a gantry. Its three landings at4/8/12m have deliberate bidirectional Use climbs,
guarded decks and a searchable top tool case. The crane's boom/hook are scenery.
The refurnished homes have rooms, matching window openings, real kitchen and
bathroom fixtures, clear stairs and pitched exterior roofs.

The91 prepared GLBs come from five verified Kenney CC0 packs, with exact source
licences, hashes, dimensions and rendered thumbnails. Catalogue descriptions
explicitly separate the65 original composite prop models from four reused
licensed mesh models. Do not describe these as69 newly downloaded assets. Registry,
provenance and playable credits are in `CAMPAIGN_ASSETS`, `SEARCH_PROP_CATALOGUE`
and `/candidate-credits.html`.

The candidate retains all15 existing missions, reward/item/container IDs, schema9
saves, controls, Atlas, inspection, normal/preview isolation, offline runtime and
128s Relay Lanterns base track. No engine change or Python removal took place.

## Authoritative data and compatibility

`campaign-core.js` derives effective source data from the existing world, versioned
layouts, district definitions, explicit route/spawn data and the prop catalogue.
JS movement and Python rules consume the same compiled collision/floors/anchors.
Normal campaign scenes use the existing world compiler rather than a second room
physics engine. Container floor metadata is separate from a wall prop's mount
height. Mission markers follow the transformed authored binding, which can sit
in front of a prop rather than at its mesh origin.

Normal keys remain `field-signal-dead-air-v9`, `field-signal-dead-air-options` and
`field-signal-v9-journal`; the structured book uses `field-signal-field-journal-v1`.
Every preview gets its own save/settings/legacy-journal/book namespace. Its actual
play tests preserve normal stored bytes. Old editor drafts are restored, not
replaced with newly furnished templates. New templates apply only where no saved
draft exists.

For an old save obstructed by changed furniture, bounded clearance repair finds
a sampled point within4m on the same zone/house/floor. Valid poses, inventory,
health and missions remain unchanged. A blocked legacy live dock patrol is moved
clear while preserving identity/health and already-moved/dead enemies. Failed
repair rejects the load; the existing startup UI retains the original save until
the player explicitly chooses snapshot/reset.

Candidate saves with searched new cargo IDs should remain with this candidate;
automatic downgrade to public v11 is not implemented. Journal notes/history are
browser-local and separate from campaign JSON exports. They persist when a
campaign slot is replaced. The archive follows that slot's current mission state.

## Verification

The final engine is SHA256
`a984494ddaf351cb9d0c986ae88682d23c7953203ecc9cb5cf266f62060553f2`.
The shared-material fix is `edffe7b`; authoritative painted roads are `f372ccb`.
The checked audit records its own exact input hashes. Final renderer/data hashes
and environment are in the performance report. Later documentation/evidence
commits do not change these gameplay rules.

| Check | Actual result |
| --- | --- |
| Python3.12.14, `python3 -m unittest discover -s site/tests -p 'test_*.py' -v` |165 passed, no skips,31.340s |
| Node22.23.4, all13 `site/tests/test_*.mjs` suites and51 runtime syntax checks |64 commands, zero failures |
| `python3 tools/audit_world.py --check` |264 sampled navigation/clearance checks,143 effective containers, zero errors/warnings |
| Road polygon generator verification |7 Python tests plus real Three.js triangulation; route/paint/generator hashes, widths, building clearance, terrain/bridge support |
| `python3 tools/build.py` |561 self-contained runtime files; original source still validates15 missions/139 containers |
| `node tests/campaign_browser.cjs` |25 checks passed; real worker, controls,3D page turn, controller, phone layout, actual contact, weapon pickup/fire, stairs/return, cargo, six crane routes, search, archive, offline and credits |
| `node tests/campaign_editor_browser.cjs` |19 checks passed;52 actual objects, new licensed geometry,69 thumbnails, numeric edit/export, real preview entry/search and stored-state isolation |
| `node tests/journal_browser.cjs` |31 checks passed; actual mesh turn, keyboard focus/activation, phone layout, controller, fallback and persistence |
| `node tests/world_preview_browser.cjs` |15 checks passed; old-worker upgrade, moved/rotated/raised hut, door/search/Atlas, offline/restart/draft return and no-storage online sample |
| Optional candidate performance harness |Five settled scenes ×20 recorded frames, real screenshots, plus100 original-world and100 candidate worker ticks per run |

The existing inventory/Atlas, environmental, editor pointer, editor import/preview,
world-editor and controller/offline suites are also wired into PR CI. See the
**current PR checks** for its final remote result and downloadable verification
artifact; no unpublished pipeline is described as a deployment. Exact local logs
and selected actual screenshots are in `verification/game-first-candidate/`.

The complete First signal expedition is separately exercised in the actual
Python engine using collision-constrained navigation: leave base, reach/search
hut, take recorder, return, deliver, reload and refuse a second reward. The browser
uses the resulting real save to inspect its archive. Long cross-map walking was
not a continuous physical-device browser playtest; browser fixtures use the
supported save importer for representative positions and controlled enemies.

Integration uncovered and fixed stair landing/ceiling catch, buried pier/car
support, live patrol obstruction, wrong actor-floor collision, rAF interference
with climbing, canonical climb-death outcomes, keyboard journal conflicts,
missing isolated-preview model registration and duplicated home material maps.
Existing tests also needed their legacy automatic-furniture counts and generic
front-anchor aiming updated for the new authored props; actual mesh/binding and
Use checks remain required. The old merged road layer was explicitly replaced
with paint generated from the repaired centre lines.

## Measured costs and visual evidence

See `CANDIDATE_PERFORMANCE.md` and its raw before/after/final reports. Sharing one
home material palette removed64MiB from the scene-referenced RGBA+mipmap estimate,
with identical geometry/draw counts in that paired comparison. This is an
estimate, not measured GPU allocation. The later road paint fix is reported
separately. Targeted40–50m Python sight-line medians dropped from about45–49ms to
0.45–0.59ms after exact rotated-box clipping.

Field draw calls, high referenced texture cost and deferred GPU allocations
remain the main performance concerns. Cloud Chromium141/SwiftShader at low
quality and0.35 pixel ratio is not a device fps benchmark. No physical iPhone,
iPad, Mac/Safari, thermal or GPU-memory pass is claimed. Do not promise30/60fps.

Actual output, including controlled fixture positions:

- [Physical journal](verification/game-first-candidate/journal-3d-game.jpg)
  and [turning paper](verification/game-first-candidate/journal-page-turn-game.jpg).
- [Phone journal](verification/game-first-candidate/journal-phone.jpg) and
  [real completed-mission archive](verification/game-first-candidate/journal-completed-mission.jpg).
- [Furnished kitchen](verification/game-first-candidate/forester-kitchen.jpg),
  [village](verification/game-first-candidate/village-street.jpg),
  [railway crossing](verification/game-first-candidate/rail-crossing.jpg) and
  [gantry](verification/game-first-candidate/docks-crane.jpg).
- [Actual home editor](verification/game-first-candidate/forester-editor-upper.jpg)
  and [its playable preview](verification/game-first-candidate/forester-preview-interior.jpg).

## Play the candidate

Download the `field-signal-candidate-<commit>` artifact from a passing PR#83
verification run, unzip it, and serve its extracted directory:

```sh
python3 -m http.server 8001
```

Open http://localhost:8001/ . Use a separate port/origin for the candidate so its
browser campaign remains separate from production. The artifact is a static site;
opening `index.html` directly does not provide worker/module HTTP loading.

Alternatively use a fresh checkout:

```sh
git clone --branch feat/game-first-candidate https://github.com/thundercato/bunker-game.git field-signal-candidate
cd field-signal-candidate
python3 tools/build.py
python3 -m http.server 8001 --directory dist
```

Try the following real flows:

1. Continue a compatible exported v9 backup, or begin fresh. Collect the PM from
   maintenance, insert a magazine, rack and disengage safety. Preserve an original
   export before experimenting with candidate saves.
2. Open Journal/N; switch sections, turn pages and use View target on Atlas.
   Change Display quality to Balanced for3D; Battery saver/reduced motion use2D.
   Visit Vera/Mikhail to record actual encountered communications.
3. Complete First signal and verify its350-credit outcome in Archive. Visit the
   Forester's cottage and Village homes; open doors, search and use both stairs.
4. Find Seaward pier on Atlas. Search the quay crates and approach the west side
   of the gantry at approximately `(109.4,-151)`. Use each ladder landing, search
   its top tool case and deliberately descend. Guarded decks prevent an accidental
   fall through the ladder opening.
5. In `/editor/`, select Forester's cottage, edit/save/export and Test in game.
   Confirm the original campaign remains unchanged. For the bounded rotated hut
   sample, use `/?buildingPreview=hut&play=1` on this candidate origin.
6. Wait for Saves & offline to say ready, disconnect and reload. Recheck searched
   contents and journal archive without rerolling or repeating a reward.

## Exact continuation

Review PR#81 before its dependent PR#83; retarget/retest appropriately if the base
branch is merged. Publish only after approval of the actual combined candidate.
Keep cache/release coordination in the runtime track. The parallel editor task
owns its new tools/UI; it should consume the asset registry and shared layout
fields at a declared integration checkpoint, not duplicate schemas or simulation.

Next useful work is physical-device profiling and a coherent eastbank/military
or bog gameplay district. Most other homes still use their v11 interiors. V2
terrain/road/water/district-transform drafts remain authoring-only, except the
existing bounded hut placement preview. Future weighted loot, mission graphs,
APR/surge/pod/checkpoint/fatigue/drowning mechanics are not implemented by this
candidate. Do not restart M0/M1, discard this content, or switch engines.

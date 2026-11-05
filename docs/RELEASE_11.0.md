# Overgrowth 11.0.0: published and verified

**Play:** https://thundercato.github.io/bunker-game/

Verified on 5 November 2026. The actual public site reports `overgrowth-11.0.0-20261105` / version `11.0.0`, starts the Python engine, loads the environmental assets and passes the public-site checks described below.

Published source commit: `4833cff5e104342e2390485fa946e5c4ba52ceee`.
Main feature merge: [PR 76](https://github.com/thundercato/bunker-game/pull/76).
Successful verification, Pages deployment and post-publication checks: [workflow 41952502236](https://github.com/thundercato/bunker-game/actions/runs/41952502236).

## What changed

- Fuller, irregular pine meshes with textured bark and detailed nearby branches. Distant trees use transparent renders of the same meshes. Original tree positions and collision locations are retained.
- All eight searchable vehicles replaced with damaged SUV or covered-car models, preserving their loot and interaction identities.
- All 37 buildings receive weathered surfaces and roof/exterior treatment, including imported windows, entrance details, pitched roofs and an arched hangar roof. Existing walkable interiors, doorways and stairs remain.
- Scanned mossy rocks, stumps, deadwood and ferns supplement the forest floor. Nearby detail is bounded by the rendering preset rather than drawing every source asset at once.
- Five additional material sets, plus locally hosted models, textures and provenance.

The loaded model library has 58 families. Two new pine variants were generated and baked with MIT-licensed EZ-Tree, not scanned. Building shells and roof structures still include authored geometry combined with imported facade modules. This is not a claim that every building is an externally downloaded complete house. See [asset credits](../site/V11_CREDITS.md).

## Screenshots of the actual rendered build

These are screenshots, not concept paintings:

- [Forest](verification-v11/forest.jpg)
- [Survey hut](verification-v11/hut.jpg)
- [Village](verification-v11/village.jpg)
- [Replacement vehicle](verification-v11/car.jpg)

## Verification completed

GitHub's final run passed all three jobs: verification, deployment and public-site verification.

- 87 Python tests, including gameplay/save compatibility and the environmental asset checks.
- 33 JavaScript unit tests: 15 input/audio and 18 Atlas tests.
- 15 project-path/controller/offline browser regressions.
- 35 inventory, inspector, map, mission and interface scenarios, including the existing tablet/landscape-phone layout matrix.
- 15 Overgrowth environment scenarios. These traverse all 37 open exterior doorways and all 14 upstairs routes, target and search a replacement vehicle, check near/far rendering limits and confirm that outdoor nature is hidden in the refuge.
- Seven additional local Linux WebKit compatibility checks passed on retest, including controller-input simulation, inventory images, inspection and map controls. These are not physical iPhone tests.
- All 13 checks against the actual public URL passed. They include the release identity, all model families loading, compatible existing storage continuing, item pictures, interactive 3D inspection, objective centring, mission access, full caching, offline restart with unchanged inventory, offline model inspection and Controller Clinic. No missing runtime assets or JavaScript exceptions were recorded.

Initial post-merge runs exposed two test-harness startup races: a fixed short sleep before clock advancement, and a browser request before the local HTTP server was listening. The tests now wait for actual clock advancement and server readiness, without changing or mocking the simulation. The complete final suite was repeated successfully; checks were not bypassed to publish.

## Saves, loading and limits

Campaign schema **9**, key **field-signal-dead-air-v9**, and the calmer **Relay Lanterns** refuge score remain unchanged. V9/v10 progress at this same address should continue automatically. The Atlas, mission shortcuts and all 61 item previews are retained.

The complete runtime is approximately 65 MB before transport compression. Allow the first asset download to finish. If an old title remains, finish loading and refresh Safari. Do not clear website data without exporting the campaign.

No physical iPhone, iPad or controller was tested. Software-rendered browser tests do not establish mobile frame rates, thermal behaviour or memory limits. Detail transitions are currently discrete. Some remaining props and structural geometry are authored rather than scanned, and every possible route or encounter is not certified by these checks.

## Native app

This release remains browser-based. A native-app assessment is a separate next step, documented in [Native evaluation](NATIVE_EVALUATION.md) and the [roadmap](ROADMAP.md). No engine migration or native app is claimed here.

# Editor v2 execution — 6 November 2026

## Baseline and ownership

Branch `codex/editor-v2-suite`, from latest main `be64a7f`. Clean fresh checkout;
no existing user files removed/reset. Confirmed AGENTS.md and all six requested
brief/design/world/cloud/parallel documents present and read. Also read the
handoff, architecture and next-steps records. Rechecked main and open PRs after
implementation. PR #81 remains open at
`476441ee2def32752031c20124c6bbdc2077a14c`; its file list and world-entry diff were
inspected. No dependency on another task's uncommitted work or automatic adoption
of that unreviewed branch. M0/M1 compiler not recreated.

Track A's canonical compiler/schema, game code, assets, journal, save keys,
release/cache/deployment and progress docs are unchanged. Editor entry changes
are isolated imports/mounts and UI gestures; compare PR #81 seams before merging.

## Capability checklist (not a release claim)

| Brief milestone | Editor / portable authoring | Actual game preview | Published |
| --- | --- | --- | --- |
| E0 audit | Complete; baseline and ownership above | Existing baseline only | No |
| E1 anchored dimensions | Face/corner tool, opposite anchors, rotated local maths, precise offsets, snapping, transaction cancellation, undo/redo, collision rebuild, old layout JSON | Existing v1 layout adapter retained; regression verification below. Moved world building depends on #81 | No |
| E2 hierarchy/assets | Type-filtered multi-selection sets; bulk lock/hide/isolate/move; named portable collections; 54 registered models inspected, 31 reviewed placements; provenance and measured/estimated costs | Collections are editor metadata; props use existing v1 decoration/collision path | No |
| E3 terrain/paths/water | Existing sculpt/scatter extended with brush outline/flatten target, snapped/cancelled gestures, individual grounding locks, hierarchy/regions/layers, curve point/width editing and circle-water inspection | Authoring-only proxies; no full-map runtime geometry | No |
| E4 refuge/components | **Blocked** on canonical local scenes/component contracts; no speculative runtime fields | Not implemented | No |
| E5 weighted loot | Real grouped 139-container/61-item workspace; reusable defaults/overrides, bulk preview, history, deterministic authoring simulator, validation and recovery/export | **No weighted gameplay adapter**; legacy independent loot preserved | No |
| E6 missions | 15 real missions/4 sources; graph drag/connect/delete/pan/zoom, typed ports, form alternative, prerequisites/policy/currency proposals, real object links, validation/history/export | **No graph evaluator**; unsupported mechanics disabled | No |
| E7 release integration | **Blocked** on IR-01 packaging and accepted runtime contracts; review overlay only | No combined #81 integration claimed | No |

Selection collections are sets of stable existing children, not canonical scene
parents. World/building documents retain existing schemas and keys. Per-object
hidden state is session-only; world layers/region are portable. Whole buildings
remain source-bound placements with existing children/bindings, not arbitrary
new instances. Floor openings continue to use the existing shared compiler.

## Recoverable checkpoints

- `e748b07`: anchored resizing/local offsets; `f5a1106` and `bada308`: interaction tests.
- `b36a9b4`: model inspection; `2a4aa5a`/`25e171a`: browser/laptop coverage.
- `b4beba4`: collections and mounts.
- `d2da468`, `166c07b`: world selection/brush transactions/locks.
- `26c5a09`, `991a459`, `109da7a`, `719af3e`: loot workspace, semantics, recovery.
- `e0efe85`, `bf3f423`: mission workspace and caption corrections.
- `a640a96`: workspace links, binding deep links, review overlay, integration requests.

## Verification (in progress; final results appended below)

Python 3.12.14: all 96 tests passed (1.597 s). Node available in this environment
is v24.22.1, rather than CI's v22. Existing pure tests: 15 client, 18 Atlas,
54 layout, world-v2 aggregate and 57 world-document passed. New pure suites:
9 asset cases, hierarchy 9 assertions, 33 loot cases, 27 mission cases,
599 resize assertions, 24 world assertions. Syntax and whitespace checks passed.

Canonical `python3 tools/build.py` validates unchanged content (15 missions,
139 containers, 61 item/preview models), builds 273 files. **It excludes the new
editor files.** Run `python3 tools/editor_v2_review.py` for a local editor review
build. This deliberately leaves shared release infrastructure alone. Do not merge
or deploy this branch without IR-01; the normal CI build's browser tests will need
the accepted packaging change. Review-overlay tests do not prove new-editor
offline availability. Existing runtime offline regressions are tested separately.

Linux Chromium 141 / Playwright 1.56.1 / SwiftShader, at 1280×800 to 1600×1000;
not physical Mac/iPhone testing or a hardware performance benchmark. Real screen
captures and JSON reports are archived under `docs/verification-editor-v2/`.

Initial browser passes: asset workflow 12 checks; resize 13 checks; world 9;
hierarchy 7; loot authoring/isolation/recovery; mission flowchart 12. Extended resize
coverage is being verified. A world startup error in layer UI synchronisation was
found by browser testing and fixed in `a640a96`. The initial canonical-build world
attempt failed on missing new modules (IR-01), then passed from the review overlay.
An extended corner-test failure is being investigated before final results.

## Remaining scope and next checkpoint

Full master brief is **not complete**. Do not advertise E2–E7 as delivered wholesale.
Remaining: connected world/focused interiors on one canonical document; real parent
assemblies/templates/new instances; pivots/box selection; texture tiling/material
painting; finer terrain/dirty tiles, spacing/exclusion scatter and instancing;
bridges and terrain cut/fill; water depth/murk/sound/dry exclusions; refuge/local
scenes, pipes/audio and APR/fuse/protection/discovery/siren/surge/pod/save/sleep
components; mission item/world rewards, dossier art, timers/candidate retrieval and
all gameplay policies; accepted runtime loot/graph execution and publication.

Next checkpoint: Track A reviews IR-01 additive editor packaging and selects the
actual #81 compiler/preview revision. Integrate those seams preserving both tracks,
run canonical build plus editor/actual-game and old-worker/offline/save/draft
regressions, then consume the accepted IR-02–04 contracts. Do not duplicate engines
or silently treat authoring proposals as gameplay. No merge/live publication.

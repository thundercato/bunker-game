# Field Signal: staged execution plan

Publication checkpoint: Field Signal 11.1.0 is hosted and verified; main run
42277856101 passed verification, Pages deployment and public-site checks. See
`EXECUTION_2026-11-06_PUBLICATION.md` for the release identifier, public link and
verification path. Future game/editor work remains on feature branches.

Prepared 6 November 2026. This is the current continuation plan, not a promise that the whole roadmap fits one build. Read `CODEX_HANDOFF.md` and the decision register first. Preserve the playable release until an independently testable replacement is approved.

## Current game-first continuation

The active candidate is PR #83 on `feat/game-first-candidate`, stacked on PR #81.
See `MEGA_BUILD_PROGRESS.md` for implemented scope and the dated candidate execution
note for final verification, screenshots and play instructions. M0/M1 already
exist and must not be recreated. Main/public release is unchanged pending approval.

Continue from the reviewed candidate, retaining its real content and stable IDs:

1. Review the final artifact and run the first expedition, both directions of the
   crane, home stairs and journal on physical target Safari devices. Prioritise
   the measured field draw-call and texture-memory costs; cloud SwiftShader does
   not establish a mobile frame-rate budget. Compare before changing engines.
2. Complete a coherent eastern river/crossing/military or bog gameplay district,
   with access/mission tests and actual screenshots. These areas largely retain
   v11 art; do not describe eight scene sets as a complete rebuilt map.
3. Extend the shared versioned compiler to one district's full placement and
   physical children in an isolated game preview. V2 proxy selection/export is
   implemented, but district/terrain/road/water draft changes are not normal-game
   integration. Preserve all old v1/v2 drafts and normal/preview state keys.
4. Design an explicit portable export for structured journal notes/history before
   calling campaign JSON an all-data backup. Current browser-local book records
   are separate and retained when a campaign slot is replaced. Candidate saves
   with the four new cargo search IDs have no automatic downgrade to public v11.

Do not merge either pending PR or replace production without approval of the
actual candidate. A PR check, downloadable build and local preview are separate
from a deployed release.

## M0. Reproduce, measure, checkpoint

Status: baseline reproduced and initial cloud measurements recorded in
`EXECUTION_2026-11-06_M0.md`. All six browser suites and baseline pure tests passed.
Hardware/GPU/decode/peak-memory and sustained combat measurements remain open.

- Inspect current HEAD, working tree, README, release files, existing tests and the v2 authoring-only boundary.
- Run the baseline commands from `CODEX_CLOUD_SETUP.md`. Record actual versions, commands, results and environmental failures. Do not substitute historic pass counts.
- Add or improve optional diagnostics for median/p95 frame time, draw calls, visible triangles, texture/geometry estimates, worker simulation duration, message bytes, loading stages and asset decode time. Explain unavailable GPU timing rather than inventing it.
- Define repeatable scenes: refuge corridor, furnished two-storey house, dense forest, village vehicles, combat plus particles, item inspection and the full-map editor during a brush stroke.
- Record mobile measurements separately from software-rendered cloud CI. Proposed goals: responsive desktop editing; a stable 30 fps minimum-quality mobile target and 60 fps where measured hardware permits. These are goals, not current guarantees.
- Create a short architecture decision note. Do not replace Python or Three.js before knowing which costs dominate.

Acceptance: reproducible baseline, isolated preview intact, a ranked bottleneck list with evidence, and a committed next-slice plan. Do not spend indefinitely profiling instead of delivering a small improvement.

## M1. Authoritative world data and one end-to-end building

Status: schema/compiler and bounded Survey hut actual-game preview implemented.
The world editor can test that building's placement with its saved v1 interior;
the shareable example opens an isolated moved/rotated hut. Other v2 world drafts
are still authoring-only. See `WORLD_DOCUMENT.md`; do not rebuild the v2 editor UI.

Create a versioned world-document contract that combines terrain, building instances, local interior definitions, roads/rails, water, objects, regions and stable gameplay references. Validate before applying. Compile it into the data both rendering and gameplay consume. Keep renderer-specific caches separate from authored state and player state.

First vertical slice: take Survey hut 03 with an existing v1 interior, move/rotate/raise the building in a v2 draft, then open an isolated actual-game preview. Its shell, walls, doors, furniture, search anchors, loose items, mission map target and physical boundaries must all follow the same transform. Return to the editor without losing the draft. The normal game must still load its approved world.

Tests must include local-to-world conversion and inverse conversion, 90-degree rotation, a moved bound cupboard, an upstairs item, floor heights, opening a door, physical search range, mission objective coordinates, JSON round trip, existing v1/v2 draft compatibility and no changes to the production save/settings/journal.

Do not attempt every building and all terrain in a single unreviewable change. Land the schema/compiler tests first when necessary, then the preview adapter. Use feature flags or explicit preview documents rather than mutating global DATA during normal play.

## M2. Building tools that solve the reported layout problems

Status: planned beyond current centre-based transform tools.

- Add edge/corner resizing with a chosen fixed edge. Resize in local coordinates; visibly show the anchor. Test rotated floors/walls and a numeric width change that leaves the chosen opposite edge stationary.
- Make focused interiors and in-world cutaways views of the same document, with synchronized edits and history rather than independent copies.
- Upgrade connected stair/floor openings and landings, exterior/interior door/window alignment, textures and material controls, snapping, grouping and reusable building templates.
- Separate structural collision from model detail while deriving both from the same authoring definition. Run reachability/headroom/gap checks and actual walks.
- New building instances require unique child/interaction IDs and explicit source/mission binding rules.

Acceptance: fix one existing two-storey house with the tool, traverse both floors in the actual preview and retain the corrected layout after export/import. Use actual before/after screenshots.

## M3. Terrain, painting, paths and water in the runtime

Status: prototype UI exists; runtime integration outstanding.

- Share terrain sampling between game and editor; increase local precision where the 12 m prototype grid cannot represent needed detail.
- Apply automatic building/painted-object grounding with stable foundation semantics and manual locks. A terrain stroke plus its dependent adjustments is one undoable transaction.
- Keep seeded vegetation reproducible, spacing natural and locked instances unchanged. Use instancing, region culling and detail levels for game rendering; do not render thousands of heavyweight standalone objects.
- Generate curved road/rail meshes, drivable/walkable/collision surfaces, terrain blending and explicit bridges. Validate slopes, joins and crossings.
- Combine a global water level with explicit local volumes. Define precedence/exclusions; keep underground refuge interiors from accidental flooding. Implement depth sampling and eventually the approved slowing/drowning rules, with no swimming.
- Preserve editor layer locks and region isolation without confusing 'hidden in editor' with 'removed from game'.

Acceptance: a changed hill, building foundation, painted area, bridge and pond agree visually and physically in a saved isolated game preview. Locked objects stay locked. Performance is measured on representative scenes.

## M4. Refuge and APR authoring

Status: planned.

Expose the underground base, pods, corridors, doors, pipes, shelves, lamps, audio emitters and interactive stations as authorable entities. Add protection/discovery volumes, lever/fuse states, save chambers, beds, storage and linked passages. Authoring tools must not imply that all new gameplay is already live.

Acceptance: an edited refuge pipe/shelf/door remains aligned in game; an APR prototype shows its real protection boundary and power state; no collision/mission anchor is stranded after a station move.

## M5. Weighted loot and real mission authoring

Status: planned; existing game has simpler loot/progression.

Implement bounded weighted draws, per-item repeats/quantities, reusable table defaults and container overrides, plus the grouped master editor. Resolve guarantee/mission-item budgeting before introducing misleading percentage controls. Provide a deterministic simulator and distribution report.

Introduce declarative mission graph schemas and runtime adapters for the existing collect/deliver/reach/interact actions first. Support voluntary acceptance, grouped all/any dependencies, source-specific offers, prerequisites, abandonment-as-failure, retry/death policies and idempotent rewards. Add other node types only with working gameplay and tests; disabled/planned nodes must say so.

Acceptance: author a fixed-location retrieval, a persisted random-location retrieval, an ordinary multi-item collection, a delivery and a two-branch failure/retry case. Verify stable object references after moving their building, correct rewards once only, no progression softlock and safe reload.

## M6. Next game mechanics, in separately testable slices

Status: approved direction; not a completed v12.

1. Explicit world-state reset/persistence matrix and transactional checkpoint storage.
2. APR activation/fuse repairs, discovery and safe-zone boundaries.
3. Surge scheduling/warnings/sirens, protected indoor effects and external erasure.
4. Incubation respawn, clothing issue, ordinary death recovery and post-death autosave.
5. Cryo save interaction, entry/exit autosaves, newest-save continuation and in-app quit warning.
6. Rest/fatigue, forced collapse, wake conditions, enemy perception while unconscious and sleep interrupted by surges.

Do not combine contradictory rules by accident. Resolve the open timing units, active-mission reset details, manual-save-after-death policy and AFK needs before the corresponding slice. Offer reduced-flash/motion options and preserve audio/visual warning alternatives.

Acceptance: test events in isolation and through complete sequences including old saves, reload during transitions, retries, death, a surge and a failed write. A mission reward and a dead player's items must never be accidentally duplicated. No browser force-close warning can be guaranteed.

## M7. Optional engine/native evaluation

Status: recommendation only, not migration approval.

Follow `ARCHITECTURE_REVIEW.md`. Keep engine-neutral world/item/mission data. Compare the same representative scene and controls across current Three.js, any proposed alternative and a genuine native prototype only when justified. A WebView wrapper is packaging, not a new renderer. Preserve existing assets, licences and saves.

## Required closing record for each task

Append a dated entry below with baseline/branch/commit, changed scope, tests run and results, measurements and device/browser, known limitations, PR/deployment state and the exact next task. Keep claims narrower than evidence.

### 2026-11-06: handover checkpoint

Source audited at `d31f178a674ec16d730a7d13f59c7eb112eb24bc`. Added durable context, decisions, execution plan, cloud setup and an architecture comparison. This is documentation work; no game/editor/runtime asset changes or new playtest are claimed. No engine migration is authorised by this checkpoint. The next coding task is M0 followed by the smallest useful M1 slice.

### 2026-11-06: M0 execution and M1 schema/compiler

Baseline/latest main: `6b4f9fb9401398a65eee576f40b2d80805ef6c76`. Branch:
`feat/world-document-compiler`. M0 commit `4a4667e` contains the repeatable diagnostic
harness, raw measurements, exact baseline logs and actual screenshots; see
`EXECUTION_2026-11-06_M0.md`. No existing test failures reproduced. Browser tests
used Linux Chromium/SwiftShader, not physical Apple hardware.

M1 introduces the pure `site/world-document.js` envelope/compiler plus 57 tests
and a CI entry. Existing v1/v2 drafts are adopted without changing their formats,
storage or IDs. One building's local children compile into coherent world poses,
colliders, door/container/loose-loot anchors, spawn and container-bound mission
targets. Tests cover 90-degree movement/raise, arbitrary rotation/inverse collision,
an upstairs item, floor openings, bindings, JSON and repeat compilation. Compiler
output is **not yet consumed by the game**; the module is intentionally absent from
the shipping precache. Normal and old v1 preview runtime files remain unchanged.

Final pure verification: Python 3.12.14, 96 tests passed in 1.819 s. Node 22.23.4:
15 client, 18 Atlas, 54 layout, v2 aggregate and 57 world-document tests passed.
Syntax checks passed; build passed with the same 273 runtime files and content
counts. The six baseline browser commands all exited 0, including actual mouse/
keyboard and v1 game preview search/door actions, legacy import, offline restart,
save/settings/journal isolation, Atlas and inspection. No new runtime/cache change
requires a separate historical-worker migration in this PR; that test is mandatory
when the adapter starts shipping. Test commands and compiler demonstration are in
`CODEX_CLOUD_SETUP.md` and `WORLD_DOCUMENT.md`.

Measured priority: rendering/submission and asset budgets first; worker handler
4.6 ms median / 7.8 ms p95 in an isolated base test does not justify a Python port.
No engine change, gameplay version bump, music/control/licence change, normal save
migration, merge or publication. Implementation commits: `4a4667e` (M0) and
`cf4ef0e` (M1). Review: [PR #80](https://github.com/thundercato/bunker-game/pull/80).
PR verification was running when this checkpoint was written; local results above
are complete. No Pages deployment is requested by this PR.

**Next task:** implement only the explicit isolated Survey hut preview adapter in
the six steps under `WORLD_DOCUMENT.md`, using the existing drafts and this compiler.
Audit both JS and Python coordinate assumptions. Prove door traversal, physical
search, furniture/collision/floor alignment and Atlas target through browser UI,
preview reload/return and production sentinels; preserve legacy v1 links and offline
upgrade behaviour. Do not claim roads/water/terrain are integrated or start M2–M6.

### 2026-11-06: playable building-preview update

The subsequent request, “make the new version and give me the link to play it”,
authorises publishing this bounded preview update after verification. PR #80 passed
GitHub verification and was merged as `24de65a`; work continued from that latest
main on `feat/moved-building-preview`. The prior adapter checkpoint is implemented.

`?buildingPreview=hut&play=1` opens the reviewed hut at `(35,-48)` with 90° yaw,
without requiring an editor draft/UUID. The v2 editor Test button adopts the hut's
actual saved interior and current placement in a separate preview. Source metadata
and manifest IDs are validated before application. Rendering, door/container/loose
anchors, mission position, collision, floors and Python rules share the compiled
building transform. Manual raised previews have a matching support platform.
Unsupported placements fail visibly; other map drafts are explicitly not applied.

Normal schema-9 save/settings keys stay unchanged. Preview journal isolation now
covers the actual v9 key; the former regression test only protected the legacy v8
journal. New entry filenames and a new cache version upgrade the old worker before
loading any preview application modules. Old v1 preview payloads remain supported.

The new browser flow has passed all 15 checks, including real keyboard door use,
walking around furniture, cupboard search, Atlas, raised floor, actual v9 sentinels,
old-worker upgrade, offline reload without reroll, exact draft return and a fresh
shareable link. Python discovery: 107 tests passed, including JS/Python upstairs
surface parity, old-location rejection and sight lines crossing the moved wall.
Final full-suite/public-release results and screenshots belong in the accompanying
execution note. No physical Apple-device tests are claimed.

All seven local browser suites passed. Release PR:
[PR #81](https://github.com/thundercato/bunker-game/pull/81); implementation commits
`00e75d0`, `f6cb52a`, `2736e3f`. Exact local results, screenshots, play instructions
and the release build identifier are in `EXECUTION_2026-11-06_BUILDING_PREVIEW.md`.
The PR/Pages checks record the eventual merge/deployment and public-link proof.

**Next task:** follow the concurrently added `MEGA_BUILD_README.md` game-first
priority: world audit, flagship playable region and structured/3D journal slices,
using the completed M1 foundation. See `MEGA_BUILD_PROGRESS.md`. Target-device
review remains needed; do not repeat M0/M1 or claim full-map integration.

## Separate native Apple experiment — 6 November 2026

A dedicated `codex/apple-native-prototype` branch starts from `25cd697`.
This does not change the web/editor roadmap or make their in-progress branches
obsolete. The bounded prototype reuses the Forester’s cottage through the existing
world compiler; Swift gameplay and native rendering are isolated under
`native/apple/`. See `native-apple/PROGRESS.md` for checkpoints and actual CI
results, and `native-apple/MAC_HANDOFF.md` for continuation using Codex Local.
Simulator verification and physical-device acceptance remain distinct.

The native PR's separate existing web CI exposed a baseline audio name collision:
`audio-v9.js` assigns `this.crackle`, shadowing the inherited `audio-v7.js` method
called on fixture faults. Source/test blob hashes match baseline `25cd697`; no
web fix was applied in the read-only native workstream. Coordinate a separate
browser fix with the concurrent editor branch. Exact evidence is in
`native-apple/EXECUTION_2026-11-06.md`.

Native cloud acceptance completed at `9df6a27`: macOS run 42310250562 passed both
unsigned simulator builds and all 14 native tests per platform, plus 10 independent
SwiftPM tests and nine portable conversion checks. Exact results and actual images
are in the native execution note. Next native task: reproduce this same branch
with Codex Local/Xcode on the Mac, then perform approved physical-device/controller
and sustained performance checks. Do not restart the project or infer device
performance from these simulator passes. No merge/signing/publication authorised.

## Native phase 2 — 8 November 2026

PR #87 continues the same native project. Four compiled buildings, sampled runtime
terrain/roads, PBR channels, cached asset geometry and simulator instrumentation
are implemented. See `native-apple/PHASE_2_2026-11-08.md` for measured results and
implemented/outstanding scope. Baseline recovery tag is retained. No web/editor
source, campaign saves or Pages workflow changes belong to this workstream.

Phase2 native CI completed at a82d77a, run42503185166: both apps compiled/installed/
launched, 16 tests per platform passed; simulator-only metrics and real captures
are recorded. Next native task is physical/GPU route profiling and a bounded
RealityKit comparison, not restarting the prototype. Main/editor files unchanged.

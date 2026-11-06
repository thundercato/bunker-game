# Field Signal: staged execution plan

Prepared 6 November 2026. This is the current continuation plan, not a promise that the whole roadmap fits one build. Read `CODEX_HANDOFF.md` and the decision register first. Preserve the playable release until an independently testable replacement is approved.

## M0. Reproduce, measure, checkpoint

Status: next recommended task.

- Inspect current HEAD, working tree, README, release files, existing tests and the v2 authoring-only boundary.
- Run the baseline commands from `CODEX_CLOUD_SETUP.md`. Record actual versions, commands, results and environmental failures. Do not substitute historic pass counts.
- Add or improve optional diagnostics for median/p95 frame time, draw calls, visible triangles, texture/geometry estimates, worker simulation duration, message bytes, loading stages and asset decode time. Explain unavailable GPU timing rather than inventing it.
- Define repeatable scenes: refuge corridor, furnished two-storey house, dense forest, village vehicles, combat plus particles, item inspection and the full-map editor during a brush stroke.
- Record mobile measurements separately from software-rendered cloud CI. Proposed goals: responsive desktop editing; a stable 30 fps minimum-quality mobile target and 60 fps where measured hardware permits. These are goals, not current guarantees.
- Create a short architecture decision note. Do not replace Python or Three.js before knowing which costs dominate.

Acceptance: reproducible baseline, isolated preview intact, a ranked bottleneck list with evidence, and a committed next-slice plan. Do not spend indefinitely profiling instead of delivering a small improvement.

## M1. Authoritative world data and one end-to-end building

Status: planned; v2 draft is not yet a game world.

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

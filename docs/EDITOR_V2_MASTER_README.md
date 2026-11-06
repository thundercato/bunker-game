# Field Signal World Editor v2: complete authoring brief

Prepared 6 November 2026 for a **second, parallel Codex task** requested by Adam. This document authorises substantial editor development, not a second competing game-engine rewrite. It is a specification, not a claim that these tools are already shipped.

Read [AGENTS.md](../AGENTS.md), [the design register](DESIGN_DECISIONS_2026-11-06.md), [the current world contract](WORLD_DOCUMENT.md), [the game-first campaign](MEGA_BUILD_README.md), [the parallel-work rules](EDITOR_V2_PARALLEL_WORK.md) and [the task prompt](EDITOR_V2_CODEX_PROMPT.md). Preserve the game's current priority and ongoing work. This task lets the editor advance alongside it; it does not cancel or restart that campaign.

## 1. Verified starting point and the important boundary

At brief preparation, main was `0de93ec5cc97884273f53873fcea333f14f58d67`. The following facts must be rechecked at task start because development is active:

- The existing browser game is Overgrowth v11 with a Three.js renderer and Python/Pyodide gameplay worker. The desktop building editor already exists at `/editor/`; the full-map authoring foundation is at `/editor/world.html`.
- PR #80 has delivered M0 measurement and a **pure, versioned world-document/compiler foundation**. Do not repeat that work. Read `site/world-document.js` and its tests rather than inventing another world format.
- `docs/WORLD_DOCUMENT.md` on that main revision explicitly says the pure compiler is not yet imported by game/editor and does not turn an arbitrary draft into a playable world.
- An active draft PR #81, `feat/moved-building-preview`, head observed at `476441ee2def32752031c20124c6bbdc2077a14c`, works on the bounded actual-game Survey hut preview. Its description reports local tests, but it was **not merged** when checked for this brief. Inspect the current PR status and actual diff. Do not assume its shareable URL is published simply because the PR description includes one.
- The wider game campaign covers the environment, assets, useful searchable rooms and a 3D journal. The editor should consume its asset registry and runtime capabilities, not compete with it for game UI or asset-bundle ownership.
- The v2 full-map foundation uses simple proxies, a coarse 12 m height grid, local drafts and authoring-only terrain/paths/water. Those limits must be visible until genuine runtime integration replaces them.

The full goal is **one world, multiple views**, with the same scene definitions producing the editor, game visuals, collision, interaction, missions and saved world. The existing editor is a starting point, not disposable prototype code to replace wholesale.

## 2. Delivery principles

1. Build working tools, not another plan-only response. Progress through the ready milestones, testing and committing coherent checkpoints. A large brief can span tasks, but each task must leave useful tested work and an exact continuation point.
2. Do not use 'everything requested' as permission for a giant untested change or a feature list that conceals disconnected mock controls.
3. Keep a capability/status matrix: **working in editor**, **validated/exportable**, **works in isolated game preview**, **published in the live game**, or **planned/blocked**. These are different states.
4. Prefer new editor modules and small integration seams while the runtime task is active. Use the ownership rules before touching shared files. Never duplicate canonical schemas, physics or mission engines just to avoid coordinating.
5. Preserve existing campaigns, editor drafts, item/mission/container IDs, licences, touch/gamepad support, Atlas, inspection, music and offline behaviour. Local editor work must not mutate a player's real campaign.
6. No engine/language migration is implied. Keep current Three.js and tools unless an approved, measured change says otherwise. New TypeScript is optional infrastructure, not a reason to retool the entire project in this task.
7. User-facing text uses UK English, explicit units and short descriptions. Ask only a genuinely blocking unresolved question, one at a time. Do not re-ask decisions already confirmed.

## 3. Desktop workspace and navigation

Design for a Mac with mouse or trackpad, while supporting Windows/Linux keyboard conventions. Keep the successful industrial editor styling and improve clarity rather than replacing it with an unrelated generic dashboard.

Provide one navigable application with World, Buildings/Interiors, Assets, Loot, Missions and Validation workspaces. A focused building view and an in-world cutaway must edit the **same document**, not separate unsynchronised copies. Returning to the world preserves selection, camera and changes. Show breadcrumbs for region > building > floor > room/object. On a double-click, focus or enter the building; provide a clear return action.

Viewport controls: perspective/orthographic top and useful side views; orbit, pan, zoom, frame selection/frame all; visible north/axis/scale reference; hide roof, section/cutaway and per-floor visibility. Support selection through hierarchy and viewport, box/multi-selection, lock/hide/isolate, duplicate, group/ungroup and named collections. Do not select distant or hidden objects accidentally through floors. Show editable pivot and local/world transform mode.

Preserve W/E/R, F, G, Delete, Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Cmd/Ctrl+D and explicit save/export buttons. Shortcuts must not fire while typing values or editing node text. The Help dialog must describe actual controls, including trackpad alternatives. Release pointer capture and movement keys on blur, Escape and cancelled drags.

Inspector: clear position, dimensions, yaw/rotation policy, collision, material, layer, region and binding fields. Units in metres/degrees where appropriate. Search/filter large hierarchies and asset lists without excessive lag. Keep errors and unsaved state visible. Layout should work on common laptop screens, not only very large monitors.

## 4. One-sided resizing: highest-priority visible improvement

Adam specifically reported that centre-based scaling expands both sides when he wants to extend only one edge of a floor or wall.

Add a dedicated **Resize edges** tool, distinct from scale. Drag a face/edge or corner while its opposite edge/plane remains fixed. Show the stationary anchor, live dimension and snapping. Allow exact numeric size with a chosen anchor. Perform maths in the object's LOCAL coordinates so rotated walls/floors remain predictable. A 4 m floor centred at x=0 extends from -2 to +2; dragging its positive-X edge to +3 should produce width 5 and centre +0.5, with the negative edge still -2. The same relationship must hold after building/object rotation and under parent transforms.

Clamp or reject crossing an opposite edge/minimum thickness rather than generating negative geometry or silently flipping orientation. One pointer gesture is one undoable transaction; Escape restores the starting document. Undo/redo and export/import retain both position and dimensions. Do not save a transient drag state or run an expensive full-scene rebuild on every pointer event.

Structural assemblies regenerate openings and collision from current definitions. A doorway/window resize must maintain valid margins or clearly reject it. Stairs keep their rise, run, width, floor opening, landings and headroom relationships; never just stretch a decorative mesh while its walking surface remains unchanged.

First acceptance: actual mouse drag and numeric input extend a rotated floor from one side; the other side is unchanged, collision and visible geometry agree, undo/redo work, JSON reload matches, and the existing preview still passes. Start here while shared runtime work proceeds.

## 5. Buildings, interiors, foundations and reusable templates

A whole building is a parent entity: shell, roof, rooms, floors, stairs, doors/windows, furniture, pipes/cables, lights, audio, containers, loose-loot surfaces, mission/reward anchors and triggers are children with stable local coordinates. Moving/rotating the building composes the transform exactly once. Child identity is not a transient renderer UUID. Reuse the current compiler's coordinate rules.

Both editing modes are approved: edit in the world with roof/cutaway controls, or double-click into a dedicated building workspace. Match exterior windows/doors/storeys to interior openings. No sealed scan described as a walkable house. Show a ghosted exterior alignment overlay and collision view where useful.

Support room-purpose templates such as kitchen, bedroom, bathroom, workshop, storeroom and barracks, built from the common asset registry. Shelves and small objects should sit on real surfaces; tables/chairs have believable scale; doors need swing clearance; stairs need usable entry and landing space. Editor suggestions must not silently rearrange user-approved rooms.

New building creation, reusable templates, duplicate/group and instance overrides are intended scope. However, the current formats constrain origins/footprints/IDs. Coordinate a real schema extension with the runtime owner before enabling unsupported operations. New instance IDs, child IDs and interaction bindings must be unique; mission references must be explicitly retained, remapped or omitted. Do not copy a quest reward trigger to every duplicated house.

Terrain following is approved. Whole buildings adjust height when terrain changes but normally remain upright. Foundation mode exposes automatic versus manual/locked height, offset and footprint; choose deliberate flatten/cut/fill or support geometry with preview and undo. Do not hide huge gaps under a single centre-height sample. Automatic adjustments with manual overrides are approved; the exact foundation resolution algorithm is an engineering contract to coordinate, not a second incompatible simulation.

## 6. Underground refuge and local scenes

Extend authoring to the main refuge, incubation hall, personal room, maintenance area, trader, bar/canteen, corridors, locked rooms and connecting stairs. Pipes, wires, junction boxes, floor drains/grilles, shelves, mesh, posters, fixtures and small domestic props need stable editable IDs.

Import existing supported scene data without replacing the user's carefully edited layout with a newly seeded clean template. Where a procedural decoration cannot yet be imported losslessly, report that limit and preserve it as a locked reference or require explicit replacement. Keep distinct local scenes/coordinate frames for underground rooms and portals. A global water table must not unexpectedly flood the refuge merely because its coordinates are below a height threshold.

Support actual textured materials, editable material assignment/tiling/tint and simple light settings. Moving an emitter or light fixture should move its linked sound/flicker source. The runtime owner retains final emitter and scene behaviour; edit existing definitions rather than inventing a parallel lighting engine.

## 7. Terrain sculpting and surface painting

Approved: raise, lower, flatten-to-height and smooth brushes with adjustable radius, strength and falloff, clear brush preview, undo/redo and terrain locks. Paint ground surfaces such as dirt, grass, gravel, sand, mud and rock with blending. Increase local resolution where the prototype 12 m grid cannot represent a ditch, riverbank or foundation; coordinate format migration rather than silently reinterpreting saved height data.

Automatic terrain adjustment with manual overrides is approved. Height changes can update grounded buildings/objects and path fitting. Lock overrides must be respected. The terrain stroke and its dependent changes belong to one reversible transaction. Define ordering to avoid a feedback loop between a road fitting to terrain and terrain fitting to the road.

Keep authoring height data and runtime surface/collision sampling consistent. Tile/region rebuilds should be incremental; brush dragging must not rebuild the entire map each frame. Validate seams, slopes, access and coordinate bounds. Show terrain edits that cannot yet be previewed in the game as authoring-only.

## 8. Vegetation, rocks and environment brushes

Paint trees, grass, shrubs, ferns, reeds, rocks, roots, stumps, deadwood and debris with naturally varied scale, yaw and spacing. Use seeded randomness and persistent instance identities so a saved forest does not reroll on every reload. Offer density, radius, scale range, spacing and erase/select modes. Individually edited/locked objects survive bulk operations according to an explicit rule.

Painted objects follow ground height automatically unless locked/manual. Distinguish a transform lock from a terrain-attachment offset and from editor visibility. Ground plants should not be buried or floating after a terrain stroke. Avoid buildings, door approaches, paths and unsuitable water/slope areas with configurable exclusion masks; display the mask instead of failing silently.

Proposed conservative default while final density semantics are unsettled: add/erase explicit seeded strokes and use an explicit previewed reseed/regenerate operation. Never rerandomise existing instances just because a density slider is changed.

Use the runtime's common meshes/materials/LOD definitions. Instancing and region culling are needed for useful previews, with selected-instance highlighting and manipulation preserved. Label lightweight proxies versus actual-model preview. Do not make the whole-map editor slower by spawning thousands of full-detail standalone trees.

## 9. Roads, railways, bridges and utilities

Approved paths use editable curved control points with handles, terrain fitting, configurable width and bridges. Provide add/delete/drag points, extend/split, snapping/joins, slope warnings, elevation mode and visible generated surface. Preserve railway alignment and walkable crossings; ensure sleepers/rails do not block the player unexpectedly.

Automatic cut/fill/shoulder blending must support locks/manual overrides and undo. Bridge spans need explicit endpoints, deck height, supports and collision. Do not claim auto-tunnels exist because a curve can be drawn. Retain coordinate and terrain contracts owned by the runtime/compiler track.

A reusable path placement tool is a useful additional tool for fences, pipes, cable runs, poles, pylons and barriers. Treat it as a proposed implementation feature within this brief, not a previously shipped capability. Objects still need IDs, spacing, orientation, material and collision metadata. Keep cables, poles and junctions aligned.

## 10. Water, swamps and exclusion volumes

Adam chose option C: a global water level plus individually editable water volumes. Surface height and bed depth are distinct. Provide a clear top-down outline and inspector for level, boundary, visual material/murkiness, sound and gameplay classification. Existing circles can be retained; polygon/spline boundaries are a proposed extension requiring validation and migration.

Global and local overlap precedence, underground dry exclusions and bridge interaction must be explicit. No fluid simulation, erosion or dynamic currents are required to deliver this editor. Future gameplay uses shallow-water slowing, deeper resistance and drowning, with no swimming. Do not display a movement/drowning field as 'working in game' until the real runtime supports it and tests verify it.

Terrain changes should visibly update the wetted area and sampled depth. Allow a safe editor depth/debug overlay and warnings for submerged entrances or inaccessible mission items. A visually blue plane is not proof of playable water integration.

## 11. Asset browser, materials and model inspection

Consume the common game asset registry and provenance rather than independently downloading/replacing the game task's model bundles. Search and filter by category, purpose, biome, tags, licence, mesh cost and runtime readiness. Show real rendered thumbnails, dimensions, triangle/draw-call estimates where available, material/texture cost estimates and licence/source details. Flag estimates as estimates.

Click/drag to place, snap to floor/wall/support, preview orientation before drop, and inspect a model with rotate/zoom. Use existing 61-item inspection where appropriate instead of inventing incompatible item IDs. Distinguish decorative prop, searchable container, loose item, equipment and interactive station. A cupboard mesh alone is not a loot container.

Correct pivots, units, normals, materials, colliders and LODs through an agreed import pipeline. Restrict file types and sizes. No imported script execution, embedded tokens, proprietary ripped art or fonts. New source assets and licence edits are coordinated with the game/asset owner; the editor may request missing categories and author supported placeholders clearly labelled as such.

## 12. Loot: per object and master management

Provide an inspector for each searchable container and a master table grouped by region > building > room/container. Search/filter, drill down, jump to viewport object, copy table/reference, bulk edits with preview and undo, inherited default versus local override, and reset-to-default must all be explicit.

Approved generation model is bounded WEIGHTED selection:
- Minimum/maximum number of selections, with clear distinction between draws, distinct types, stacks and total units.
- Relative item weights, quantity/stack ranges and duplicate permission per item. Bandages may repeat; a gun can be limited to one selection.
- Table simulation using deterministic seeds; show first-draw probability separately from estimated overall inclusion probability. Mark Monte Carlo estimates and sample count. Never label weight 100 as guaranteed.
- Detect empty pools, all-zero weights, unsatisfiable minimums, no-repeat depletion, missing items, invalid quantities and capacity conflicts. Do not silently violate duplicates or delete generated contents.
- Show actual item thumbnails/models and inventory properties from the shared catalogue.

Guaranteed/preallocated items, their draw-budget treatment and reward overflow were not settled. Mission-critical placement must be controlled by the mission, not an accidental weighted chance. Read the decision register and ask only if this blocks the current implementation. A provisional authoring extension must not be silently ignored by the game.

The first parallel deliverable can be the real editor/table validation and deterministic simulator; actual in-game loot generation changes belong to a coordinated runtime slice. Separate authoring JSON from the legacy loot format until a tested migration is approved.

## 13. Mission workspace and graph authoring

List existing missions and sources first. Each mission has clear information controls for name, description, dossier artwork, objectives, destination, source, rewards, prerequisites, retry/death/abandon behaviour and related objects. Selecting a radio/NPC in the scene shows its mission offers; clicking a mission target selects the real object, not just arbitrary coordinates.

Use a visual flowchart of events, conditions, objectives and actions, with typed ports and clearly labelled outcomes. Support zoom/pan, selection, deletion/reconnection, undo, graph minimap or fit, and a readable form/list alternative for complex fields. Use declarative data, not user-supplied executable JS/Python.

Approved scenarios and rules:
- Retrieve a unique item from a fixed location; choose and persist one location from candidates on activation; collect ordinary items anywhere; deliver a supplied object to a named destination.
- Always offer missions for voluntary acceptance. Unlocking is not auto-acceptance. Allow no active mission.
- Source-specific stages and dependencies: initial single offer, later three offers, an all-required join before the next stage, and cross-source unlocks for side quests. Main/side classification differs from exclusivity.
- Sequential/parallel objectives and explicit all/any joins. Prerequisites can include completed missions, discovery, items and relationships where supported.
- Time limits with explicit units/start/pause/retry semantics, failure/success branches and optional consequences. Abandonment uses failure logic.
- Per-mission player death policies: preserve progress/recover item, restart, or fail. Surge policy is a separate world reset contract, not silently mapped to ordinary death.
- Monetary/item/world-action rewards and persistent history; repeated events/reloads must not grant twice.

Approved long-term objective vocabulary also includes reach/discover/investigate, repair/activate/deactivate, rescue/escort, eliminate/clear, defend/protect, survive/wait, stealth, communicate, track, craft/build. Display unsupported mechanics as unsupported, not a node that pretends to work. Complete and test collect/deliver/reach/interact first; do not implement escort AI or the entire campaign engine inside the editor task.

Graph validation: unresolved references, invalid type connections, missing completion/failure branch, unreachable nodes, unintended cycles, impossible dependencies, unavailable runtime actions, mismatched delivery ownership and permanently failed prerequisite softlocks. Refer to actual world IDs even after building movement.

Art controls can choose existing/uploaded safe image assets and compose a dossier with actual target view and map circle; automatic paid image generation is not implied. A preview image must not be mistaken for a renderer screenshot. Licence and file-size rules apply.

## 14. Rewards and mission placement zones

Edit invisible mission/reward anchors and bounded zones attached to surfaces or buildings. Physical items may appear on a shelf or enter a named container. Shared zones can receive rewards from several missions. Show local axes, extents and collision occupancy; move them with the parent.

Choose one/many catalogue items, money, conditions and delivery location. Preview placements so objects do not intersect. Storage capacity and overflow policy remain deliberately deferred; do not make earned rewards disappear. An idempotent pending-reward record is a technical proposal to preserve entitlement, not permission for infinite storage or a final overflow rule. Clearly distinguish previewed placement from committed reward generation.

## 15. Gameplay authoring hooks: APRs, surges, pods, sleep and saving

Provide editable components only through shared, versioned definitions and supported runtime adapters. The following are approved target behaviours, not a claim they already exist in the playable build.

### APRs and refuge
- Powered safe-zone boundary and discovery trigger; hidden from the player map until discovered. Main base is protected.
- Large activation lever, fuse socket, readable offline/starting/online/fault status, optional scripted repair requirement. Once repaired, ordinary stations stay on; random future fuse failures are not selected.
- Save chamber, optional bed/storage, linked/locked passages and named destination/code/mission conditions. Walkable underground links are not automatic instant fast travel.
- Enter a powered protection volume before the final surge flash and be safe; no arbitrary lockout. Display the real boundary in test mode.

### Surge
- Configurable safe/danger interval, provisionally 22-44 in-game hours, split-flap time-to-danger/negative-overdue indicator rather than exact prediction.
- Approximately 4-5 minutes of strange sky/static buildup and 2 minutes of spatial sirens were discussed, but warning units/overlap and scheduling distribution remain unresolved. Keep them explicit, not hard-coded assumptions.
- Siren objects/coverage preview, negative/whiteout outside, indoor flicker/blackout/emergency red/reboot/shudder/dust; reduced-flash/motion controls.
- Reset matrix separates ordinary field loot/enemies, outside dropped items, active missions, protected inventory, player survival needs and permanent discoveries/progression. The actual clock does not skip just because a surge occurs.

### Death, rest and checkpoints
- Incubation pod hall and nonsequential visible numbers; new body in pants/vest plus basic clothing issue drawer, no free gun/ammo. Ordinary lost gear is recoverable until erased by a surge; exact packaging remains unresolved.
- Manual save-only upright cryo chambers, no healing/rest/time benefit. Single rotating autosave plus separate manual checkpoint, latest committed save chosen on Continue.
- Auto entry into powered safety, canonical departure at the bottom of base stairs facing out, and atomic post-death respawn save. No normal field save or hidden suspend-save; in-app quit warning, without pretending the browser can intercept every force-close.
- Voluntary sleep only in safe zones, exhaustion collapse anywhere, 50% rest normal forced wake, possible disturbance wake after 15% recovered, danger still active. Sleepers do not attract enemies magically. Urgent wake priority and exact rest timing require the existing decision register.

Authoring UI should show units, descriptions, validation and runtime support beside every component. The editor must not silently change game's save policy, death code or mission reset behaviour merely to make a panel look complete.

## 16. Playtest tools, validation and publishing

Support an editor walk test and explicit actual-game preview using isolated world/campaign/settings/journal namespaces. Toggle editor debug tools for collision, navigation/access, trigger boundaries, floor sampling, interaction reach, sound coverage and rendering costs. Trigger supported test events such as mission completion/failure, inventory load, reward placement, death, surge or APR fuse failure only in preview. Detect unsupported events and explain dependencies.

Validation should select the offending object/node and describe a repair. Separate blocking errors from warnings. Cover geometry gaps, blocked openings, stairs/headroom, reachable loot, terrain seams/foundation gaps, road/rail slopes, flooded entrances, overlap, missing model/licence, duplicate IDs, unsafe imports, invalid mission graphs and performance hotspots. Automated checks do not replace actually walking the building.

Publishing remains Draft -> Test -> Validate -> Approve -> GitHub release. Local save/export is not publication. Offer a change summary and last-tested revision. Invalidate validation after edits. Export versioned portable documents; import without silently wiping incompatible drafts or copying production saves into preview. Keep backup/migration/rollback paths.

Do not put a personal access token in this public static editor. Direct authenticated GitHub proposals, if developed later, need a separate secure design. For this task, preserve export/review/PR flow. Release metadata, cache manifests and workflows are shared integration files: coordinate changes instead of racing the runtime task. An approved release is complete only after deployment and actual public-site verification.

## 17. Performance and compatibility

Retain bounded rendering and editor usability: dirty-region terrain rebuilds, instanced foliage, batched static visuals where safe, cached model thumbnails, lazy panels, a spatial index for picking/snapping, and capped pixel ratio. Preserve reliable picking/IDs when instancing. Avoid expensive textures or shadowed point lights merely to decorate the editor UI.

Offer responsive authoring and actual-model/game-preview modes with truthful labels. Do not substitute a simple proxy and then claim full-quality visual parity. Model registry LOD/material/physics definitions are shared with the game track. No new engine migration or wholesale asset-bundle rebuild is authorised here.

Measure interactions and long frames on realistic document sizes. Separate cloud software-renderer results from physical device performance. Report tested browser/version/resolution, scene and limits; never promise all devices or a particular speedup without measurement.

## 18. Suggested useful additions

These fit the editor direction but are lower priority than correctness and the required tools:
- Searchable command palette and configurable shortcuts.
- Prefab/room presets with intentional instance overrides and a reviewable update diff.
- Reversible scatter, pipe/fence/cable brushes and surface-alignment assistance.
- Object bookmarks, selection sets and a small location minimap.
- Automatic detection of repeated/copied binding IDs and a reference-impact panel before deletion.
- A guided first-edit tour using real operations, not a video that cannot be replayed in the editor.
- A per-region performance/asset budget report and accessible colour-independent validation markers.

Do not let these displace one-sided resizing, shared document consistency, safe previews or robust saved drafts.

## 19. Milestones and acceptance

| Milestone | Useful completion evidence |
| --- | --- |
| E0: integration contract | Current main/PR audit, file ownership, existing tests recorded; no duplicated compiler or restarted M0. |
| E1: building editing upgrade | Actual edge-handle and numeric anchored resizing, local/world transforms, snapping/undo/export, real screenshots and collision/preview regression tests. |
| E2: hierarchy and asset workflow | In-place/focused-view navigation, groups/layers/search, registered real thumbnails and intentional child transforms. Runtime-dependent views clearly marked. |
| E3: terrain/path/water tools | Reversible brush/dependent updates, seed/lock behaviour, curve/bridge/water editing and validations; actual preview only when supported by shared runtime. |
| E4: refuge and interactive components | Editable supported base/APR/station objects, pipes/lights/audio, stable references and clear planned/runtime capability status. |
| E5: weighted loot | Working per-container/master editor, inheritance/overrides, deterministic simulator, validation and stable export contract. Integration tested separately with runtime owner. |
| E6: mission/reward authoring | Real graph editing/list inspector, source/target links, supported objective execution in preview, validation, reward idempotency tests; unsupported node types explicit. |
| E7: integrated release candidate | Updated runtime contract consumed, combined branch tests, save/draft/cache upgrade checks, real walkthrough screenshots, reviewable PR and release approval. |

Continue through ready work rather than stopping at a plan or one decorative button. When a dependency is unavailable, record it and build another independent milestone. Do not force all milestones into one commit. Do not claim E7 when only authoring UI exists.

## 20. Testing checklist

Use current `CODEX_CLOUD_SETUP.md` and workflow commands; confirm new tests from the runtime PR before integration. At this brief's baseline, tests include Python unittest, client/Atlas/layout/world-v2/world-document units and actual game/editor browser suites. Add tests in editor-owned files and record execution commands, not invented global npm scripts.

Essential editor checks:
- Real pointer drag, numeric edits, keyboard/trackpad equivalents, focus/input safety, cancelled transforms and undo transactions.
- Rotated anchored resize, valid door/window margins, floor-hole/stair alignment and no stale collider after save/reload.
- Draft export/import/backups, rejected malformed IDs/URLs/NaN/oversized graphs, unique instances, preserved legacy drafts.
- Terrain-follow versus locked/manual objects, reproducible scatter and edits after density/seed change.
- Mission/container references after parent transforms, exact quantity/duplicate/weight semantics and simulation reproducibility.
- Preview cannot modify ordinary save, settings, discovered locations or the actual journal key. Test old service-worker upgrades and offline restart with the real previous runtime.
- No browser exceptions, missing assets, temporary mock links or unreachable controls. Capture screenshots of actual scenes.

Record status in an editor-specific progress file, not by concurrently rewriting the game task's `NEXT_STEPS.md` or progress log. Link the companion PR, pin the dependency commit used for integration and state what has not been device-tested.

## 21. Open decisions and honesty

The full feature list is deliberately ambitious. Some runtime mechanics, graph execution nodes, global reset details, water policies, guarantee/overflow semantics and prefab migrations remain unsettled. Refer to the canonical decision register and ask only when those decisions block the current slice. A proposed schema/disabled control is not a completed mechanic.

The user has approved full editor development and the previous recommended broad choices. This brief is not approval to overwrite concurrent work, publish without review, fabricate results or charge for external assets/services. Keep the game-first task and this editor task compatible, independently testable and recoverable in GitHub.

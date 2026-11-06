# FIELD SIGNAL: THE BIG WORLD REBUILD
## Codex mega-build README and execution brief, 6 November 2026

**Status: requested scope, NOT shipped functionality.** This is the detailed brief for a substantial game-first development campaign. It supplements, rather than supersedes, `AGENTS.md`, `docs/CODEX_HANDOFF.md`, `docs/DESIGN_DECISIONS_2026-11-06.md`, `docs/NEXT_STEPS.md`, `docs/WORLD_DOCUMENT.md` and the actual source. If two documents disagree, use the most recent explicit user decision and record the discrepancy. Never infer that a desired mechanic is already implemented.

## Mission statement

Make Field Signal feel like a coherent, atmospheric, explorable 3D survival world, not a set of primitive boxes or disconnected props. The user's priorities are (1) **the game first**, (2) major improvements to the map, environments, searchable interiors, graphics, sound and immersion, (3) a tactile, useful 3D field journal, (4) preservation of playable browser/iPhone/iPad and controller support, and (5) all new world objects authored through or made compatible with the evolving desktop World Editor. The editor integration follows the game improvement where necessary, but do not introduce more permanent hard-coded objects that the editor cannot eventually address.

The user explicitly wants an **ambitious, high-effort Codex cloud run** and is happy for it to work across many cohesive commits, tests and PRs. Spend the available effort on useful implementation, asset preparation, testing, visual QA and documentation. **Do not deliberately burn tokens or time on filler, loops, endless research or unrelated rewrites.** A large task may require several Codex sessions; make each checkpoint durable in GitHub.

### Current baseline and important correction

At the time of this brief, the playable public build is **Overgrowth v11**. The existing v1 building editor and v2 full-map authoring foundation exist. The latest `main` also includes an **M0 baseline and M1 versioned world-document/compiler foundation** from PR #80; inspect `docs/WORLD_DOCUMENT.md` and current HEAD before implementing. The world editor's terrain/road/building drafts **do not yet drive the live game's physical world**. Do not replace the existing game with a toy prototype, or claim v12 is live until verified.

The site is hosted at https://thundercato.github.io/bunker-game/ . Editor: /editor/ and /editor/world.html . GitHub: https://github.com/thundercato/bunker-game .

## Non-negotiable product and safety invariants

- Maintain browser-based, offline-capable gameplay on iPhone/iPad; desktop is important for the editor. Test landscape touch controls, keyboard/mouse, Gamepad API, audio gesture restrictions and safe-area UI.
- Preserve all existing campaign saves, inventories, mission IDs, world discovery, editor drafts, preview state and settings. Implement explicit migrations when formats change. Do not clear localStorage, alter the normal save key casually, or allow preview to overwrite a real campaign.
- Preserve the calmer **Relay Lanterns** base score, creepy outdoor ambience, drone and radio system; improve sound where necessary without reverting to harsh base music. Respect volume controls, crossfade, spatial attenuation and audio loops without clicks.
- Use legally reusable assets: prefer **CC0** where available, otherwise licence-compatible CC BY with exact author, source URL, licence and changes in manifests and in-game credits. No unverified 'royalty free' claim, ripped proprietary game assets, copyrighted music or unlicensed fonts.
- Do not claim a high-poly scan is mobile-ready. Optimise meshes, texture sizes, pivots, normals, materials, colliders, LODs and instancing; test draw calls, triangle budgets, texture/GPU memory estimates, loading and real device behaviour. Keep fallback assets if a model fails.
- Preserve stable object IDs and interaction anchors. A decorative mesh is not a working searchable item unless linked to actual container state, loot, mission rules and collision.
- Existing v11 features (15 missions, Atlas, item inspection, trading, weapons, maintenance, enemies, 139 searchable containers and so on) must remain working or be migrated intentionally. The numbers are historical, not fixed targets.
- Use a feature branch, small meaningful commits and reviewable PR(s). **Do not merge/publish to production without the user's explicit approval of that release.** The user is authorising extensive development here, not a hidden destructive migration. Run existing CI and new tests.
- A screenshot of an AI concept is not proof of implemented visuals. Capture real renderer screenshots and compare before/after. Check every asset's visual orientation and actual game placement.
- The new surge, APR, pod, checkpoint, loot and mission mechanics are agreed design directions, not permission to fake completion with menu-only toggles. Where complex, implement vertical slices and mark remaining work clearly.

## Workstream A: complete map audit and major world redesign

First enumerate the actual world: region bounds, existing 37 building definitions, 15 roads, rail line, river, coastline, villages, military garrison, caves, sewers, underground refuge, dock/pier, forest and searchable cars. Confirm actual counts from current data. Produce a **machine-readable world audit** and screenshots from representative locations.

Redesign into geographically intelligible, traversable districts with recognisable silhouettes, logical paths, readable approaches and varied landmarks. Preserve mission-critical and legacy coordinates until a versioned migration or remapping is ready. No disconnected terrain, floating roads, inaccessible stairs, blocked entrance doors, missing walls, impossible jumps, cliff clipping, buried props or loot behind inaccessible collision. Test the whole loop from base to a target, inside and back.

### Districts and landmarks to improve or add

- **Western mountains:** varied rocky ridgelines, large cliffs, scree, foggy peaks, impassable boundaries with believable terrain; no abrupt vertical box wall.
- **Northern wilderness:** dense conifer stands, natural clearings, boulders, fallen trunks, undergrowth, utility tracks, small huts, campsites, wildlife-like ambient sounds without requiring actual animals.
- **Southern bog:** reed beds, mud, pools, waterlogged timber, shallow-to-deep movement zones and escape routes. Prepare for the approved future drowning system; do not silently change gameplay before tests.
- **Eastern river:** coherent banks, currents/water sounds, road and railway crossings, usable bridges, culverts and paths; terrain/bridge collision matches visible geometry.
- **Village:** meaningful streets, driveways, street lamps, gardens, fences, gates, garages, ruined houses, small shops, sheds, kitchen interiors, multi-storey homes and broken-down cars.
- **Railway:** proper track meshes, sleepers, ballast, points where practical, platforms, a derelict station, signals, abandoned wagons and safe navigable crossings.
- **Docks/industrial waterfront:** pier, warehouses, stacked shipping containers, container gantry, cranes, hoists, stairs/ladders/catwalks with deliberate climbing interactions and fall protection logic, mooring bollards, fences, floodlights and cargo clutter. If climbing is not implemented, visually block access rather than pretending a crane is climbable.
- **Military compound:** believable walls, barbed wire, guarded gate, breached rear wall, hangar, watch towers, barracks, fuel depot, sewers and alternate ingress, appropriate loot and danger.
- **Power and comms:** pylons, telephone poles, power lines, transformer cabinets, electrical warning signs, radio masts, siren poles, relay infrastructure and consistent cable routing.
- **Underground refuge:** more believable lived-in corridors, pipes, conduits, actual floor drains, grills, mesh, hazard boxes, shelves, lockers, canteen, trader, radio, dormitory, flickering lighting, realistic junctions and readable floor navigation. Ensure the underground base remains accessible from the existing vault/stair transition.

World design should use coherent scales and prefabs, not hundreds of unaligned unique hard-coded meshes. Create meaningful variation from a small library of high-quality, repeatable components.

## Workstream B: substantial asset library and optimisation

Research real asset packs/models from reputable sources (Poly Haven, Kenney, Quaternius, eligible Sketchfab downloads, other verified providers). Download **actual permitted source files** where tools/network allow; if access is blocked, log it and use properly authored geometry rather than falsely claiming imported models.

Build an asset registry with categories, IDs, source/author/licence, original and optimised sizes, triangles, texture memory estimates, collision proxy, LOD variants, pivot/scale and editor thumbnail. Prefer glTF/GLB; consider Draco/meshopt and KTX2 only when the runtime and decoder budget are measured.

Target a **broad catalogue**, not a promise that 50 arbitrary downloaded models solve the visual problem. Include, where appropriate:
- Buildings: weathered timber cottages, plaster/brick homes, sheds, outbuildings, industrial modules, station modules, dock sheds, warehouses, hangars, barracks, doors, windows, stair modules, railings, roofs, gutters and chimneys.
- Interiors: tables, chairs, stools, desks, cabinets, medicine cabinets, bathroom cabinets, drawers, dressers, wardrobes, beds, bunk beds, sofas, armchairs, shelves, bookcases, sinks, toilets, washbasins, cookers, fridges, microwaves, wall units, lockers, safes, filing cabinets, tool benches, crates, storage chests, wall vents, lights, rugs, pipes and electrical boxes.
- Exterior: varied trees, saplings, bushes, ferns, reeds, grass clumps, roots, stumps, mossy boulders, stones, fallen timber, debris piles, fences, gates, walls, rail props, street furniture, abandoned cars, vans, lorries, boats, shipping containers, cranes, forklifts, fuel tanks, drums and pylons.
- Loot and equipment: tins, food packets, bottles, water containers, medical supplies, bandages, batteries, fuses, ammunition boxes, magazines, knives, torches, radio receivers, tape reels, paper documents, camera, backpack, detector, probes, tools and gun attachments.

Aim for **50 or more distinct believable searchable prop variants across the catalogue**, with a curated subset of sensible searchable interactions in rooms; do not place 50 search targets in every room. Preserve search sound, progress and take-one/take-all interactions. Not every decorative prop needs loot. Ensure each container has a valid anchor, reach, capacity and future editor binding. Use multiple instances/skins of good assets rather than many low-quality mismatched models.

Each room should have a logical purpose: kitchen, bedroom, living room, bathroom, office, storeroom, workshop or military space. Put cupboards against walls, align floor legs and tabletops, prevent doors from clipping furniture, avoid duplicate overlapping meshes, place switches where reachable, use real stair openings and reasonable light levels.

## Workstream C: tactile 3D field journal

Create a first-person-compatible **3D journal** that can be opened from the HUD, inventory and controller. It should look like a weathered physical field notebook/binder with covers, paper thickness, page edges, subtle paper/turning sound, tactile drag/click page-turn animation and a reliable accessible 2D fallback for low-power devices/reduced motion. Use Three.js scene meshes or an efficient 3D/2D hybrid; don't implement costly full dynamic text geometry for every letter.

Tabs or sections:
1. **Active assignments:** selected mission, objectives, dossier image, target on Atlas, source, status, timers, items, destination and rewards.
2. **Completed/failed/abandoned archive:** completion time (in-game and optional real time), mission-giver, outcome, reward, notes and persistent history. Completed missions should disappear from the live offers, but remain archived here.
3. **Field observations:** discovered locations, anomaly observations, hazard tips, artefacts, enemy types and player-entered notes if feasible.
4. **People and communications:** conversations, radio transcripts, gossip, rumours, named contacts and discovered relationships, with time/source. Do not fabricate dialogue that the player has never heard.
5. **Equipment/field reference:** weapon handling/maintenance, detector/probe use, discovered items and learned mechanics.
6. **Personal log:** expedition timeline, death/gear recovery, anomaly cycle events and player milestones; distinguish discovered facts from rumours.

Implement a **structured event journal** rather than duplicating presentation text in random menus. Append event records once with stable IDs, timestamp, category, source and payload; keep privacy/local persistence and migration. Use bounded storage/archiving, no event duplication on reload. Connect mission changes, radio transmissions, loot discovery, APR discovery and later surge events. Journal must be readable on mobile landscape, support swipe/tap/keyboard/controller page turning, tab navigation, instant close, and no screen scrolling during normal exploration. Test the 3D viewer and fallback.

## Workstream D: gameplay polish and content

Improve the first 30 minutes of play and the full expedition loop. Audit:
- Starting room and base route: unobstructed doors, maintenance, supplies, trader, radio, mission acceptance, exit, nearby loot and safe return.
- Weapon viewmodels: aim/hip-fire alignment, muzzle flash, shell/impact feedback where appropriate, hit flash, recoil, condition/jam handling, knife swing and torch states.
- Enemies: sight direction, indoor/outdoor perception, sensible pathing through doors and around props, sound cues, no shooting through solid walls, no spawns inside colliders.
- Loot: believable container-specific tables, avoid excessive contents, weight/duplicates rules as specified in the design register; maintain existing compatibility until replacement is tested.
- Missions: all current missions remain finishable; journal/dossiers and map targets are correctly linked. Test one full mission from acceptance to completion and archive.
- Audio: calmer base score retained, ambience changes by region, river sounds near water, quiet footsteps, realistic rummaging and doors, spatial fixture hum, seamless loops, radio crackle with a recognisable AM/FM prop.
- Lighting/weather: clearer interiors without making them bright and cheerful; fog, rain, wet surfaces and storms with quality settings, safe flash intensity and reduced-flash accessibility mode.
- Map: full-screen zoom/pan, player/objective centring, discovered APRs only when discovery is implemented; correct navigation across any redesigned world.
- Performance: region culling, instancing, LODs, reasonable transparency/shadow budget, texture compression where supported, adaptive resolution only if measured.

### Future major mechanics: prepare schemas, don't fake completion

The approved roadmap includes: anomaly surge cycle with 22-44 in-game-hour danger window and split-flap clock; 4-5-minute strange sky warnings and 2-minute spatial sirens; whiteout and reset; powered APR safe zones with lever/fuses and discovery; incubation pod death and gear recovery; cryo-only manual saves plus entry/exit/death autosaves; fatigue collapse and interrupted sleep; weighted per-container loot; branching voluntary missions with prerequisites/failure/death policies and rewards. These are in `docs/DESIGN_DECISIONS_2026-11-06.md`. Do not let a giant art pass break their future data requirements. Implement only coherent tested slices when time permits and report which are still planned.

## Workstream E: World Editor compatibility and next authoring improvements

**Game first**, but each new world object should be registered and compatible with the editor. Do not create an uneditable one-off world.

- Complete the already-started M1 compiler/preview adapter before doing destructive world-coordinate remapping. Integrate a single authoritative scene document for rendering, collision, interaction and mission anchors.
- Extend the v2 full-map editor to show actual low-cost model previews, regions, layers, selection, drag, grouping, visibility/locking and safe placement. Ensure roads/rails/terrain/water drafts have a genuine path to gameplay through versioned compilation.
- Make a building a movable parent entity with local child coordinates; double-click from world to edit interior; keep shell/interior alignment. No independent ghost collisions.
- Add **one-sided floor/wall edge resizing**, stable pivot/anchor, snapping and precise dimensions. Fix staircase openings, landings and upstairs traversal.
- Add a searchable thumbnail library with categories for new assets and drag placement, collision proxy preview and asset provenance.
- Add room purpose/prefab tools, loot-container inspector, named mission/reward anchors and future APR safe-zone/fuse/siren authoring placeholders as real declarative data, not fake working gameplay.
- Add a validation dashboard for gaps, floating props, blocked doors, unreachable loot, invalid stairs, terrain seams, path slopes, water exclusions, collision overlaps, missing models/licences and perf hotspots.
- Provide a **test in game** route using isolated preview saves/settings/journal. Preserve normal campaign and editor drafts. Provide portable JSON and reviewable export; no silent direct GitHub publish.
- Future mission graph and weighted-loot editor details are in the decision register. Avoid designing their UI in isolation from the runtime.

## Execution strategy: maximise useful progress, not chaos

### Phase 0: audit and protect
1. Read `AGENTS.md`, current `README.md`, handover, design register, `docs/WORLD_DOCUMENT.md`, this brief, current git HEAD and workflows. Inspect PR #80 and any concurrent work.
2. Create a feature branch. Export/test representative existing saves and editor drafts. Establish screenshot/benchmark baseline, identify current failures and record environment.
3. Make a world audit, asset licence manifest and prioritised list of defects. Capture real before screenshots.

### Phase 1: high-impact playable world slice
1. Choose one **village street + one two-storey house + nearby woodland + road/rail crossing** as the flagship region. Build it beautifully with coherent models, functional rooms, correctly placed stairs/doors and reachable loot.
2. Use versioned world data and real preview to keep all gameplay anchors aligned.
3. Implement 3D journal MVP connected to existing mission archive and real events, with mobile/controller navigation and fallback.
4. Run actual exploration, combat, loot and mission tests, plus browser screenshots.

### Phase 2: asset expansion and broad environment pass
1. Curate, download, optimise, license and register a large catalogue. Use repeatable import/validation tooling.
2. Extend props, foliage, boulders, fences, rail infrastructure, dock containers, cranes, buildings and interior dressing across districts without making every region identical.
3. Add new searchable variants only with tested container definitions and proper loot rules.
4. Validate collisions, reachable paths, lighting, audio and map coherence after each district.

### Phase 3: editor and system integration
1. Integrate changed world content with the full-map editor, one-sided resizing, parented interiors and asset thumbnails.
2. Implement one approved major mechanic end-to-end if time remains, rather than half-implementing ten: recommended first is **APR power/fuse/discovery** OR **weighted loot**, based on actual dependencies.
3. Prepare next-gameplay designs and editor schema hooks for journal, missions, surge and safe zones. Keep incomplete features clearly disabled/documented.

### Phase 4: performance, QA, release readiness
1. Compare representative before/after visuals and frame/loading metrics, especially dense forest, house interior, dock, village, base and full-map editor. Record GPU limitations and actual hardware where possible.
2. Run all relevant existing Python/JS/browser/CI suites, save migration, offline reload, input/controller diagnostics and full expedition tests. Fix regressions, don't delete failing tests to get green.
3. Document asset credits, file sizes, draw-call/triangle/texture budgets, exact features completed, known limitations and screenshots.
4. Commit checkpoints throughout, create reviewable PR(s) with summary and testing evidence, and **wait for release approval**. The user can explicitly approve a release in a subsequent Codex turn. Do not call an unverified branch a published version.

## Definition of done for each delivered slice

- Visual assets are actually present and load in game, with valid licences.
- Doors/stairs/rooms can be traversed; interactions, mission anchors and collision match meshes.
- Save/load, offline use, controller/touch and existing missions are not regressed.
- The editor can identify/preview or at minimum represent the added content with stable IDs and clear migration status.
- Tests, screenshots, measurements and limitations are committed and linked in the PR.
- New source is committed and recoverable before the session ends; a Codex run's uncommitted workspace is not a release.

## Codex cloud task management

Work ambitiously and autonomously within the repository. Spend substantial effort on the requested improvements, not a superficial plan. Use multiple commits and, if appropriate, multiple PRs by coherent scope. Prioritise working features over inflated counts. Keep a live progress checklist in `docs/MEGA_BUILD_PROGRESS.md`, update it after each milestone, and leave a precise next-action checkpoint. When nearing a session/token/time limit, commit the current working state, run feasible tests, document unfinished items and report the PR; never rely on the conversation to recover uncommitted work. Do not self-invoke a new task, bypass safety gates or deliberately exhaust quota on purposeless output.

**Final report must say:** exact branch/commit/PR, what was actually implemented, what was merely planned, asset sources/licences, actual test commands/results, measured performance, known bugs, save compatibility, and whether the public GitHub Pages game was published (only if authorised and verified).

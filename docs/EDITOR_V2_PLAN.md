# World Editor v2: approved development brief

Editor first, playable game integration afterwards. Do not change the player's normal v11 campaign, saves or gameplay rules in this release.

## Approved authoring behaviour

- Full region map with regions, editable layers, visibility and locks.
- Raise/lower/flatten/smooth terrain brushes; material painting. Adjustable size/strength, seeded vegetation/object brushes with random scale/yaw/spacing and individually editable instances.
- Buildings and their local contents form one entity. Buildings follow edited ground, with automatic foundation adaptation and manual overrides. Locked props do not follow terrain.
- Both in-world roof-hidden/cutaway editing and double-click isolated building editing. Include an underground-refuge workspace, not just exterior buildings.
- One-sided edge resizing: opposite face stays fixed instead of scaling about centre. Precise dimensions and transforms, snapping, undo/redo, reusable buildings.
- Curved roads and railway paths, terrain fitting, explicit bridge spans. Global water plane plus bounded water areas for lakes/rivers/swamps. No full fluid simulation.
- Per-container weighted loot: choose roll count first, weighted selection, per-item duplicates and stack bounds. Master hierarchy and per-container overrides. Existing guaranteed mission supplies must be retained distinctly from normal random rolls during migration.
- Mission authoring: voluntary acceptance, radio/NPC sources, dependencies/parallel objectives, branching outcomes, per-mission failure/retry/death rules, abandonment follows failure. Rewards money/items/placement zones. Conditions on world objects and discoveries.
- APR station definitions: protection bounds, lever/power/fuse requirements, discovery-hidden markers, stations remain on once repaired unless scripted. Linked doors/passage targets and save/respawn/reward markers.
- Rule authoring for anomaly timing, siren warning, blackout/reboot, cryo entry/exit/death saves and rest behaviour. These definitions do not imply v11 already runs the new mechanics.
- Local drafts and portable exports; validate and test before a separately approved GitHub release. No embedded account token and no silent live publication.

## Technical delivery

Use the repository's pinned Three.js and licensed assets. Keep v1 editor available as a fallback. New editor project format with stable IDs and local coordinates. Share deterministic editor calculations through pure modules, and provide isolated editor walk/mission/loot simulation rather than claim unimplemented runtime integration.

## Verify before release

Terrain/foundation/locked object tests; rotated building attachment invariants; edge resize keeps opposite edge fixed; bounded water/path geometry; seeded brush stability; weighted loot roll bounds and duplicate rules; graph/reference validation; import rejection without draft loss; undo/reload/export roundtrip; real mouse controls and desktop layout; normal game/saves unchanged. Publish only after test results and actual public page verified.

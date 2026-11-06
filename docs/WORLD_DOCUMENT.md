# World document v1 and isolated building preview

The schema/compiler now has an **isolated building-preview adapter** in
`world-preview.js`, `layout-preview.js`, `world-layout.js`, `terrain.js` and the
optional Python editor block. This remains an Overgrowth v11 editor update, not
the whole v12 roadmap. Normal gameplay uses the original source world and schema 9.

Play the reviewed example at
`https://thundercato.github.io/bunker-game/?buildingPreview=hut&play=1`
after the building-preview release is deployed. It moves Survey hut 03 to `(35,-48)`
and rotates it 90 degrees. Campaign, settings and journal use separate preview keys.
In `/editor/world.html`, select Survey hut 03 and use **Test Survey hut in game**.
The test adopts its saved interior draft if present and persists the world draft
before opening a new tab. Malformed interior drafts are rejected, not replaced.
Only the hut's placement/interior is applied; other world drafts stay authoring-only.

`world-source.json` records the reviewed content snapshot and byte digest, checked
by the build and preview loader. New runtime entry filenames force an old worker
update before importing cached game/editor modules. Runtime modules and source
metadata are included in precache. The actual `field-signal-v9-journal` now uses a
separate preview key (the former browser test only checked the older v8 key).

## Contract

| Field | Meaning |
| --- | --- |
| `format`, `version` | `field-signal-world-document`, `1`; reject other versions. |
| `source` | `{id: 'overgrowth-v11', revision: <full Git SHA>}` of the reviewed source content. The caller independently supplies the expected revision and matching `world.json`. A SHA label does not cryptographically verify the supplied source object. |
| `authoring` | Existing `field-signal-world/2` document: terrain, placements, roads, rail, water, foliage, regions/layers. Format and IDs stay intact. |
| `interiors` | Explicit existing layout v1 documents, unique by `buildingId`. Partial coverage is allowed; compiling a building without an interior fails. |

`createWorldDocument({source, sourceRevision, draft, layouts})` adopts portable
drafts without overwriting localStorage. Omitted `draft` creates an initial v2
document; omitted `layouts` supplies no interiors. A UI adapter must not silently
replace an existing draft with a seeded interior.

`validateWorldDocument(input, {source, sourceRevision, assets})` returns a detached
validated document. Supply the manifest asset ID set at the future runtime import
boundary; pure tests can omit it. Layout validation protects gameplay bindings and
rejects asset URLs. No JSON field is treated as executable code.

Source changes require an explicit rebase/review and updated snapshot metadata.
No campaign migration, new-building cloning or prefab overrides are implemented.
The adapter gets the expected revision from shipped metadata, not from imported
JSON. Documentation-only commits can retain the last reviewed content snapshot.

## Compilation and coordinates

`compileBuilding(doc, buildingId, {source, sourceRevision, assets})` validates first
and returns **one building**, never an entire playable-world override:

- `transform`: resolved foundation position `[x,y,z]` and upright `yaw`.
- `layout`: validated v1 interior, fixed source origin and local children.
- `objects`: world poses, stable local IDs, geometry pieces in each object's frame.
  Floor pieces include existing staircase cut-outs.
- `colliders`: world positions, bottom `y`, dimensions and yaw; door IDs retained.
- `interactions`: container, loose surface and door IDs, world anchors and child
  IDs; container/loose floor heights and loose surface extents.
- `missionTargets`: existing container-bound mission IDs and transformed anchors.
  No coordinate-nearest guessing or mission rewrite.
- `spawn`: transformed existing test marker.

Metres, Y up, radians. Positive Y yaw rotates local +Z towards world +X, matching
Three.js/layout-core. `toWorld`/`toLocal` handle placement and inverse. Child pose
composes **once** with the building. Legacy `layout.origin` is provenance, not an
extra offset. Object position is bottom centre except floors, whose position is
the floor top. Child identity is `(buildingId, objectId)`; binding IDs stay stable.

Foundation resolution uses v2's existing `objectHeight`: automatic samples the
prototype draft grid plus optional offset; manual/locked uses authored `y`. It does
not sample or replace v11 procedural terrain, create steps or guarantee access.
Terrain/roads/water/foliage remain authoring data. Layers mean editor visibility,
not deletion. The compiler intentionally does not claim these are runtime-ready.

Adapters must either mount local children beneath `transform` or use world poses,
never both. Collision/surface sampling must convert points to local space and
results back, including last floor Y and movement vectors. Do not pass world-space
`objects` back to `validateLayout`.

## Reproduce a moved Survey hut compilation

Run from the repository root:

```sh
node site/tests/test_world_document.mjs
node --input-type=module <<'JS'
import fs from 'node:fs';
import {seedLayout} from './site/layout-core.js';
import {createWorldDocument, compileBuilding} from './site/world-document.js';
const source = JSON.parse(fs.readFileSync('site/world.json'));
const sourceRevision = '6b4f9fb9401398a65eee576f40b2d80805ef6c76';
const context = {source, sourceRevision};
const doc = createWorldDocument({...context, layouts: [seedLayout(source, 'hut')]});
Object.assign(doc.authoring.buildings.find(b => b.id === 'hut'), {
  x: -70, z: -100, y: 2, yaw: Math.PI / 2, foundation: 'manual'
});
const building = compileBuilding(doc, 'hut', context);
console.log(building.interactions.find(i => i.id === 'hut_c1'));
console.log(building.missionTargets.find(m => m.id === 'signal'));
JS
```

Cupboard/First signal target: `[-72.4, 2.39, -103.5]`. This is compiler output,
not a live game change. Tests include upstairs items, inverse conversion, arbitrary
yaw collision samples, JSON round-trip, protected bindings, deterministic repeated
compilation without mutation, and all 37 existing template binding ID sets.

## Implemented preview boundary and next task

The adapter mounts the compiled local interior at its building transform, patches
container/loose anchors and mission coordinates in a cloned preview-only source,
and suppresses the original shell, partition collision and procedural upper floor.
Both JS and Python transform floor/stair sampling, collision and door positions.
A manual raised foundation has a visible 2.5 m support apron, matching preview
surface sampling. Foundations below 0 or above 8 m, river/swamp/boundary placements
and overlap with other source buildings are rejected. Whole-map sculpting is not
compiled; the automatic foundation height uses the existing prototype draft grid.

The shareable example uses a fixed separate preview namespace. Reopening continues
that preview's own campaign; a new editor Test creates a fresh UUID. Old v1 preview
URLs/payloads remain supported. Importing a campaign backup is still possible in a
preview, but it writes only the preview namespace. No schema-9 key is renamed.

Verify with `node site/tests/test_world_preview.mjs`, Python discovery and
`node tests/world_preview_browser.cjs`. The browser runner also accepts `GAME_URL`
for post-deployment verification. It checks real mouse/keyboard door/search actions,
Atlas, v9 journal isolation, old-worker upgrade, offline restart, return to draft,
and a fresh-context shareable example. Python tests compare JS-generated floor and
stair samples for moved/rotated/raised one- and two-storey interiors.

Next: inspect the actual screenshots and target-device behaviour of this bounded
preview, then decide the next building/editor slice. Broader terrain/roads/water,
new buildings and M2–M6 systems remain unimplemented. Do not mark full-map runtime
integration complete. Keep physical iPhone/Mac/controller checks separate from
headless Linux browser verification.

# World document v1: M1 compiler checkpoint

This is a **pure schema/compiler foundation**, not a moved-building game preview
or a v12 release. `site/world-document.js` has no storage, asset loading, renderer
or worker dependencies. It is deliberately not imported by the game/editor or
included in `precache.json` yet. Runtime files and persistence keys are unchanged.

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

Source changes require an explicit rebase/review. No revision or campaign migration,
new-building cloning or prefab overrides are implemented. The next adapter must
obtain the expected SHA from trusted build metadata, not trust an imported document
to provide both sides of the comparison. Documentation-only commits can retain
the last reviewed content snapshot.

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

## Exact next slice: isolated preview adapter

1. Adopt the existing v2 draft and hut's existing v1 draft into this envelope. Add
   an explicit preview payload type; retain old v1 preview links/storage. Validate
   source revision and manifest IDs before starting a worker.
2. Thread the compiled building through `layout-preview.js`, `world-layout.js`,
   `terrain.js` and `engine.py`. Current adapters assume unrotated X/Z and ground
   origins. They cannot consume this output as-is.
3. Replace original shell/collision and interaction anchors in the **preview-only
   cloned** source. Audit inherited v6–v11 layers and procedural terrain for old
   physics/floors/doors left behind. Use the same transform for surface sampling,
   line-of-sight, search/door range, movement and spawn.
4. Retain source IDs for container and Atlas target patches. Mount the complete
   existing local layout, furniture and door pivots, without regenerating its
   content from the moved source coordinates.
5. Browser acceptance: move/rotate hut in editor, open preview, open door, walk in,
   search `hut_c1`, verify First signal on Atlas, return to saved draft, reload
   preview and compare production campaign/settings/journal sentinels. Add raised
   floor and upstairs JS/Python parity tests before claiming full M1 acceptance.
6. Then add the runtime module to precache and test a real old-worker upgrade,
   old v1 preview, legacy saves and offline restart. Do not rename campaign schema
   9 or existing persistence keys.

The adapter must explicitly warn/reject unsupported draft changes rather than
suggest the whole map is playable. Full-map terrain integration and normal-world
publication remain outside this slice.

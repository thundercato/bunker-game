# Authored district candidate, 6 November 2026

This is implemented candidate content for the game-first campaign. The campaign
adapter decides when to load it; this file does not authorise a production release.
Existing building, container, vehicle and mission IDs stay in the source world.

`site/districts.json` contains 95 authored objects in eight districts: village,
woodland, crossing, railway, docks, utility spur, western ridge and refuge. New
garden boundaries have open gates and driveways; the cargo quay uses four actual
Kenney CC0 shipping-container instances, textured crates, mooring bollards,
floodlights and an original lattice crane. Woodland clearings and western rock
silhouettes use existing licensed moss-rock and deadwood assets. New poles branch
away from the old utility line, with an explicit cable link to its pole at
`(-36,-125)`. Railway work adds ballast shoulders, fastening
clips, open crossing equipment and signals around the existing rails/sleepers.
Refuge detail sits against walls and ceilings, clear of the existing save furniture.

The renderer does not create searchable loot, simulate a crane hook, or add another
set of source houses, trains, cars or railway rails. The dock crane's ladder is
bound to explicit campaign climb routes; its boom and hook are decorative.

## Definition and renderer contract

The format is `field-signal-districts/1`. Districts have a stable `id`, `zone` and
`objects` array. Each object has a stable `id`, `component`, `asset`, metre `size`,
`transform: {x,y,z,yaw}`, `colliders` and `surfaces`. Imported models use licensed
registry IDs; original components use `field-signal:component-name`. An optional
`assetRotation` normalises an imported model before fitting its desired dimensions.
Transforms are authored against the current terrain, rather than silently moving
legacy mission anchors. Future terrain authoring must deliberately reground them.
`grounding` records whether an object follows terrain, the pier deck, the rail
surface, or a container stack. Garden `groundProfile` grids store local height
offsets; the renderer bilinearly samples them for each post, rail and picket.
Their shorter collider segments use those same heights. This keeps the rear fence
returns grounded when their front edge lies on a village slope.

Children are local to their parent object. Collider `{x,y,z,w,h,d,yaw}` values use
the box centre; surface `{x,y,z,w,d,yaw}` values use the floor's top. The shared
campaign compiler consumes these same values for collision and support heights.
The renderer deliberately adds no collision records or player/save mutations.

`buildDistrictScene(world, definition)` requires the existing Three.js world
`scene`, asynchronous `model(id, spec)`, and optional `label()` interfaces. It uses
`naturalMaterials` when available, retaining the v11 licensed wood and rust maps.
It returns `{root, groups, objects, counts, errors, updateVisibility}`. `objects` is
a Map from authored ID to `{definition, districtId, group, cell}`. Decorative mesh
parts are merged by shared material in 24 m cells. The crane keeps its actual mesh
root so a gameplay adapter can attach ladder interactions there. Merged mesh UUIDs
are never authored IDs. Opaque merged meshes enter the world's occluder list.

The returned root is attached to the world scene and marked global because it
contains multiple zones. Call `updateVisibility(player, zone, quality)` after the
world's normal visibility update. It culls cells by zone and distance, with 80 m,
115 m and 165 m maxima for low, balanced and high quality; vegetation setting
changes also hide the authored fern cells. Asset load errors are retained in
`errors` with object/asset IDs and use a visible procedural fallback.

## Crane route and safe screenshot positions

The crane is `docks-crane-01`, at world `(113,0,-151)` without rotation. Platforms
cover local X `[-3,3]`, Z `[-2,2]` at Y 4, 8 and 12 m. The west railing has a
1.35 m opening on each landing. Structural legs and rails have authored collision.
The outside ladder plane is local X -3.25; the player's climbing shaft is X -3.6.

Three bidirectional routes join ground → 4 → 8 → 12 m. The first canonical start
is world `(109.4,0,-151)`; subsequent starts and every upper endpoint are world
`(110.4,4/8/12,-151)`. Poses face east with yaw `-Math.PI/2`. Local `via` points
move out through the railing opening, climb beside the deck, and enter above its
edge before lowering 0.15 m onto the landing. Reverse routes must reverse `via`.
No canonical endpoint exceeds the engine's 30 m save-height limit. Decks have
real support surfaces and the route does not pass through their solid floors.

Useful actual-game viewpoints, with Y sampled by campaign terrain/support:

| Scene | Position X, Z | Yaw | Purpose |
| --- | --- | --- | --- |
| Village street | `-8,-179` | `Math.PI/2` | West along cottage gardens and street lamps |
| Village approach | `-44,-174` | `-Math.PI/2` | East along the street and open driveways |
| Woodland clearing | `-55,-70` | `Math.PI/2` | Rock, fallen timber and fern foreground |
| Railway detail | `-96,-115` | `-Math.PI/2` | Ballast, existing track and signal silhouette |
| Cargo quay approach | `103,-148` | `-Math.PI/2` | Crane, platform railings and suspended hook |
| Container stacks | `84,-148` | `Math.PI/2` | Cargo stack against the existing pier shops |
| Crane ground start | `109.4,-151` | `-Math.PI/2` | Explicit first ladder interaction |
| Crane top landing | `110.4,-151`, Y 12 | `Math.PI/2` | Deck support, rail opening and pier overview |
| Refuge services | `-500,31` | `Math.PI/2` | Wall junction, stencil and pipe details |

The pier's existing geometry has a floor near Y 0 while old terrain sampling
returned -1 in the river strip. The campaign surface adapter must use Y 0 on the
pier. Existing road/rail intersections at the Crossing keeper and signal-box
source footprints are a pre-existing defect; the new timber crossing boards are
at the open track patch near `(-93,-108)` and do not cover either house. Ballast
and crossing furniture now follow the campaign route catalogue's detours around
the old building footprints. Source road/rail indices remain stable.

## Verification and budgets

`node --check site/district-scene.js` and
`node site/tests/test_districts.mjs` pass. Tests cover stable IDs, malformed data,
rotated local-to-world poses, every source building footprint and door approach,
licensed campaign asset references, pier-bound crane endpoints, landing/rail
clearance, outside-shaft waypoints, geometry construction, authored-data isolation
and zone/distance/vegetation culling. The test also creates the effective campaign
source with its repaired roads and four interiors, runs the real Python terrain
sampler, and checks every terrain-following object, garden grid point, cable end
and crane landing against it. The final reground changed 46 Y values, including
small precision corrections; the pier baseline and 2.59 m container stack remain
explicit. Stub-model geometry construction produces
146 merged meshes, below the authored 450 whole-candidate merged-mesh ceiling;
these are not measured live frame times or actual imported-model triangle counts.
The full geometry catalogue is distance culled and only nearby cells render.

The parent campaign task owns actual browser screenshots, integration validation,
offline assets, JS/Python parity, release state and physical-device limitations.
No physical iPhone/iPad frame-rate or Safari result is claimed here. Original
procedural geometry has no external asset dependency; third-party models and
surface maps retain their own registry manifests and credits.

Next task: run the candidate in the integrated game, visually inspect the table's
viewpoints, traverse the crane in both directions, and record actual draw calls,
triangles and screenshots before considering release.

## Candidate sight-line review and optimisation

The integrated Python candidate initially sampled each sight line at 0.15 m
intervals and scanned all 612 candidate colliders at every sample. A 40 m line
required 267 complete scans, and a 50 m line required 334. The exact replacement
in `campaign_rules.py` transforms the segment into each collider's local frame
once and clips it against the footprint. It retains the prior door, floor-height,
vertical reach, strict boundary and 0.02 m footprint-padding rules. It also detects
thin obstacles that fell between the old samples.

Controlled before/after measurements used the same effective campaign source,
doors open, Python in this Linux container, seven calls per case and median wall
time. All three lines are clear. These CPU measurements are separate from browser
rendering and physical-device frame-rate claims.

| Line X,Z → X,Z | Old candidate scan | Exact candidate scan | Old full `clear_line` | Exact full `clear_line` |
| --- | --- | --- | --- | --- |
| `-80,-70 → -40,-70` | 40.598 ms | 0.372 ms | 44.597 ms | 0.586 ms |
| `-70,-220 → -30,-220` | 44.324 ms | 0.268 ms | 45.060 ms | 0.451 ms |
| `-140,-200 → -90,-200` | 50.460 ms | 0.322 ms | 49.388 ms | 0.506 ms |

`python3 -m unittest discover -s site/tests -p 'test_campaign_geometry.py' -v`
passes six focused tests, including rotated boxes, diagonals, tangency, zero-length
and reversed lines, height/door filters, a missed thin obstacle and 300 seeded
comparisons with the former sampler. The 13 integration tests in `test_campaign.py`
also pass, covering the crane, legacy saves and full first-assignment expedition.

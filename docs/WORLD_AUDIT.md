# Playable-world audit

6 November 2026. The reproducible inventory is
[`verification/game-first-world-audit.json`](verification/game-first-world-audit.json).
It inventories actual files and exercises the Python game rules; it does not
repeat M0, replace the M1 compiler, or claim a whole-map editor integration.

Run from the repository root:

```sh
python3 tools/audit_world.py
python3 tools/audit_world.py --check
python3 -m unittest discover -s site/tests -p 'test_world_audit.py' -v
```

The default command applies the candidate's existing pure `campaign-core.js`
adapter, authored interiors and routes when their registries exist.
`--source-only --output /tmp/source-audit.json`
audits the preserved v11 snapshot instead. `--world /tmp/effective-world.json`
accepts an explicitly compiled world. Outputs contain hashes, stable IDs and
coordinates, with no timestamps or machine paths. `--check` fails on stale output
or structural/navigation errors; warnings remain visible without failing it.

The preserved source contains **37 buildings, 14 two-storey buildings, 51 storeys,
139 searchable containers, 15 missions, 15 roads, 9 loot profiles, 8 searchable
vehicles, 31 loose-loot surfaces, 28 partitions and 14 portals**. The historical
37/139/15/15 counts agree with the data.
The candidate retains those IDs and adds four searchable dock-cargo targets,
bringing its current container count to 143; that intentional difference is
recorded in the machine-readable historical comparison.
The file's `version: 6` and older `build` label are legacy content/schema fields,
not evidence that the live game is a new v6 release.

The field bounds are **x -240 to 360, z -700 to 150 metres**. Movement stops at
z 148 in the southern bog. Four underground regions intentionally occupy separate
coordinate spaces: refuge x -518…-482/z -8…54; cave x -818…-782/z 0…64;
storage bunker x -663…-637/z 0…38; sewer x -1123…-1077/z 0…115. They must not be
rejected for lying outside the field rectangle. Every building footprint, storey,
container ownership/profile, source station, mission prerequisite, guaranteed
mission item, road point, rail point, bridge and portal destination is included.

The audit identified these concrete defects in the preserved source:

- Rail centrelines pass through the crossing keeper, signal box and rail service
  hut. There are 22 road segment/footprint intersections, including the main
  village road through the Postmaster's house and Northcroft. Some are approach
  endpoints inside buildings; the report distinguishes these from through paths.
  These are geometric layout findings, not proof that the surrounding district
  is globally unreachable. Keep building/mission/save coordinates stable and
  reroute candidate transport geometry.
- The rail extensions rise into terrain despite their flat rail meshes; the
  preserved source reaches 5.741742 m of terrain beneath nominal 0.11 m rails.
  Candidate terrain now flattens the full authored rail route. The audit samples
  land spans at no more than two-metre intervals and excludes explicit bridge
  spans when checking for buried rail geometry.
- The `tower`, `orders` and `beacon` field map markers are respectively 0.300000,
  2.745906 and 0.583095 metres from their bound containers. Candidate source
  adaptation binds them to those existing container coordinates. Underground
  `cave`, `shelter` and `tunnels` markers deliberately identify surface entrances;
  treating them as stale container coordinates would be incorrect.
- All seven pier-building container locations sample the river-bed surface at
  y -1 despite their authored floor being y 0. The candidate requires an explicit
  pier surface override. The search tolerance allows those interactions, so the
  audit does not mislabel all pier loot as unsearchable.
- `car7` at (-43,-319) has an authored floor of 0 while the terrain is 2.488862 m.
  The original search rejects every sampled approach within 3.4 m because the
  floor difference exceeds 1.7 m. The field cache at (-6,-24) has a 0.755946 m
  offset: its search works, but its old floor placement sinks most of the crate
  into the hillside. Unparented field props need terrain-following visual and
  interaction floors.

Original findings remain under `preservedSourceLayoutFindings` and
`historicalCounts.preservedSourceFieldTargetDrift` after candidate fixes. Current
transport overlaps and validation results are separate, so a corrected candidate
does not erase the evidence or misrepresent an old defect as still active.

The current candidate passes **264 navigation checks with zero errors and zero
warnings**. All 143 containers have a sampled approach accepted by actual search
rules. The report includes four compiled house interiors, 95 district objects,
153 local colliders, three deck surfaces and one ladder structure, plus 69
searchable prop variants with 68 actually placed after interior overrides.
Candidate transport has no remaining centreline/building
footprint intersections. These counts are generated, not content targets.

`campaign-spawns.json` moves the existing `st4` patrol from (84,-151) to the clear
quay at (84,-149). The audit records the original and effective spawn definitions
and checks the adjusted spawn against actual collision. Regression tests verify
that save loading moves only a living patrol trapped at the old cargo location,
preserves health/inventory/progression and pursuit targets, leaves dead or already
clear patrols alone, and remains idempotent after a serialised reload.

Each building entrance is sampled closed and open, every legacy two-storey stair
centre has 65 height/collision samples, both bridge centres have 81 samples, and
all portal destinations, refuge stations, spawn, military gate/breach and river
boundaries are checked. Every container gets a sampled walkable approach followed
by an actual `search` dispatch. Standing inside a cupboard is not required: thirteen
old container origins overlap partition collision, but a usable approach can
still exist. Combat is disabled only within this static search check.

Candidate registries are optional while work is in progress. Once present, the
report includes district objects, local colliders, surfaces, ladder routes and
matching raised landings; searchable prop IDs, dimensions, loot profiles and
interaction reach; and the licensed asset registry. Missing WIP registries are
not fabricated validation failures.

The measured stored model library currently has **152 models, 641,223 triangles,
186 materials and 21,017,442 geometry-buffer bytes**. Decoded GLB payloads plus
barrier JSON total 29,333,293 bytes; actual model/bank files transfer 33,543,455
bytes because older banks use base64. This includes 91 new low-poly licensed
models (27,142 triangles; 1,344,660 model bytes), alongside the older library.
There are 151 machine-readable model provenance records: 148 CC0, one CC BY 4.0,
and two MIT; the barrier retains its separate `CREDIT.txt`. Eleven surface sets
are also enumerated. All provenance stays attached to its exact source/author.

These are **library totals**, not draw calls or triangles visible in a frame.
The script parses actual indexed/non-indexed GLB primitives and base64 model
banks, deduplicates geometry buffer views, and separately reports decoded accessor
bytes. It excludes image/animation bytes from geometry. Stored mesh counts do not
multiply scene instances, and declared source triangles are kept separate from
the actual optimised payload. No GPU allocation, texture residency, sustained
frame rate or physical-device result is inferred. Older expensive meshes remain
visible in the report, including rubber boots (56,128 triangles) and the bed
frame (49,990); broad use still needs measured budgets and suitable LODs.

Static local sampling cannot prove global reachability, head clearance through
every furnishing, or a renderer ray hit. Python does not contain all procedural
tree and furniture colliders. Actual screenshot/traversal evidence, offline/save
regression checks and device testing belong to the campaign execution record.
No browser/GPU run or new performance benchmark is claimed by this audit.

Verification: all 19 audit tests passed. The generated candidate report passed
its structural/reference checks and all 264 real-engine navigation checks.
Final integrated verification passed all 150 Python tests on Python 3.12.14,
all 11 Node pure suites and 51 JavaScript syntax checks on Node 22.23.4. Exact
command/output logs are in [`final-python.log`](../test-results/final-python.log)
and [`final-node.log`](../test-results/final-node.log).

# Authored campaign cottage interiors

6 November 2026. `site/campaign-interiors.js` exports the pure
`createCampaignInteriors(source)` factory. It seeds the actual building documents,
authors their rooms, and returns validated v1 layouts. The source world is never
mutated. This module supplies content; the campaign adapter is responsible for
mounting it and deriving physical interaction positions from the same bindings.

| Building | Source origin X/Z | Floors | Objects | Retained search containers / loot surfaces |
| --- | --- | --- | --- | --- |
| `forester`, Forester’s cottage | −30 / −59 | 0 and 3.2 m | 52 | 4 / 1 |
| `v1`, Rowan cottage | −30 / −166 | 0 and 3.2 m | 52 | 4 / 1 |
| `v2`, Postmaster’s house | −14 / −168 | 0 and 3.2 m | 53 | 5 / 1 |
| `v3`, Grey gable | 4 / −168 | ground only | 41 | 4 / 1 |

All four retain their 10 × 9 m source footprint and origin, existing entrance and
internal door interaction IDs, every original container and loose surface binding,
and the original ground/upper floor objects. No save schema, loot profile,
guaranteed contents, mission ID or building ID changes here. `v2_chest` remains
upstairs. The selected homes include the Postmaster mission container, so normal
campaign integration must derive mission targets from bindings too.

There are 198 objects, including 17 working container bindings and four physical
loot surfaces. New props without a binding are decoration. They do not create
extra loot or searchable interactions. The named semantic variants use exactly
the dimensions in `search-props.json`; imported furniture uses the dimensions in
`assets/campaign/registry.json`. The factory deliberately fails if one of these
reviewed buildings acquires a different footprint.

The three two-storey homes have a kitchen at the rear, a front dining/living area,
a hall radio, an east staircase, an upstairs bedroom and bathroom. Forester’s
drawer binding becomes a tool bench, Rowan’s becomes a writing desk, and the
Postmaster’s becomes a roll-top clerk’s desk. Rowan has two single beds; the other
upstairs homes have a double bed and reading chair. Grey gable has a ground-floor
rear bedroom and a separate front bathroom. Its original single-storey structure
is retained.

Actual CC0 Kenney models provide sofas, beds, chairs, bookcases, bedside stands,
kitchen sinks, cookers, refrigerators, washbasins, toilets and showers. The existing
licensed table remains the physical loose-loot surface. New semantic cabinet,
wardrobe, dresser, hamper and mirror geometry provides furniture suited to its
room. Imported models face −Z; semantic searchable props face +Z. The authored yaw
accounts for that difference. Licence/provenance records belong to the asset
registry and searchable catalogue, rather than being duplicated in layout JSON.

Window objects replace opaque shell sections. There is no original wall left
behind their glazing. The main ground partition uses the retained internal door;
new bedroom and bathroom doorways have no campaign door binding and use the
existing open-passage behaviour. The stairwell wall also guards the west edge of
the opening. Each room and upper landing has an authored light, with 19 point
light objects across the four houses; the runtime quality budget still determines
how many actual lights are active.

## Exact binding placement changes

Positions below are local bottom-centre coordinates in metres. All original
container profiles and saved contents remain authoritative despite their visual
variant. Only `v2_chest` has a 3.2 m floor; all other containers remain ground-floor
interactions. A wall prop’s visual mount Y must not be interpreted as a new floor.
Every container explicitly retains its original physical floor through the
optional `binding.floor` metadata accepted by the shared v1 validator/compiler.

| Binding(s) | Original seeded position | Authored position | Authored visual |
| --- | --- | --- | --- |
| `forester_c0`, `v1_c0`, `v2_c0`, `v3_c0` | (−4.5, .85, −3.4) | (−4.69, 1.38, −3.4) | Double wall cupboard; Rowan glazed cupboard; Postmaster single cupboard |
| `forester_c1` | (4.5, 0, −3.4) | (−2.4, 0, −.25) | Tool workbench against the kitchen partition |
| `v1_c1` | (4.5, 0, −3.4) | (−2.4, 0, −.25) | Writing desk against the kitchen partition |
| `v2_c1` | (4.5, 0, −3.4) | (−2.4, 0, −.25) | Roll-top clerk’s desk against the kitchen partition |
| `v3_c1` | (4.5, 0, −3.4) | (4.65, 0, −3.4) | Bedroom chest of drawers |
| All four `*_c2` | (−4.5, 0, .4) | (−4.55, 0, 1.05) | Hall wardrobe clear of the partition |
| `forester_kitchen`, `v1_kitchen`, `v2_kitchen` | (1.3, 0, −3.97) | (1.3, 0, −4) | Kitchen drawer base |
| `v3_kitchen` | (1.3, 0, −3.97) | (−.8, 0, −4) | Kitchen drawer base, west of bedroom wall |
| `v2_chest` | (−4.5, 3.2, −3) | unchanged | Banded travel trunk |
| `forester_table`, `v1_table`, `v2_table` | (−.5, .015, 2.3) | (−2.3, .015, 2.45) | Dining table, clear of the entrance route |
| `v3_table` | (3.35, .015, .6) | (−2.3, .015, 2.45) | Dining table, clear of bedroom/bathroom approaches |

The three existing `stairs-main` objects retain their centre, rise and ID, with a
1.6 × 5.8 m footprint instead of 2.05 × 7 m. The shared floor cutout leaves 1.29 m
front/rear landings instead of the original 0.69 m strips. The old east drawer
placement was beneath this run; the old west locker intersected its partition.
Both problems are corrected by the binding placements above.

Runtime search anchors should come from each semantic variant’s
`interaction.anchor` and `interaction.reach`, transformed by the object’s yaw and
building transform. Using a generic half-height anchor loses the authored front
offset and wall-mount height.

## Walk routes and verification

`node site/tests/test_campaign_interiors.mjs` checks 31 cases using the shared
layout collision, floor, movement and validation helpers. It checks the real
catalogues, source immutability, complete stable bindings, closed/open doors,
furniture overlap/support, both exterior levels, wall/window duplication, reachable
front approaches and the actual complete stair route. Deliberately blocked
passages and a low stair beam must fail the walking checks.

All coordinates here are local X/Z; routes use 4 cm movement steps with a 25 cm
player radius and the normal 1.65 m body. The upstairs Y is 3.2 m.

- Entry: (0, 5.9) → (0, 3.6) → (0, 1), then the retained kitchen door to
  (0, −1.1). The outer and kitchen doors obstruct this path when closed.
- Kitchen: reach the west cupboard at (−3.7, −3.4), the partition desk at
  (−2.4, −1.1), and the north drawers at (1.3, −3.1), or (−.8, −3.1) in Grey gable.
- Living room: from (0, 1), reach the wardrobe at (−3.65, 1.05). Approach the
  dining loot from the east at (−1.05, 2.45), without crossing the table or chairs.
- Upstairs homes: (0, 3.6) → (3.5, 3.6) → (3.5, 2.9), climb to
  (3.5, −3.35), turn west to (1.1, −3.35), then south to (1.1, −1.7).
  Enter the bedroom at (−.45, −1.7), pass the bed foot at (−2.8, .55), or enter
  the bathroom through (1.1, .9) and walk to (1, 3.1). Walk the full reverse stair
  route and leave through the front door.
- Postmaster chest: from the bedroom entrance, turn north at (−.45, −1.7) to
  (−.45, −3), then west to (−3.6, −3). Its original binding stays upstairs.
- Grey gable: reach the bedroom via (0, −1.8) → (2, −1.8), with its bed foot at
  (3.05, −.25) and drawers approached at (3.8, −3.4). Reach the bathroom via
  (1.1, 2.3) → (2.6, 2.3) → (3.8, 2.3).

The full stair tests exposed two existing shared-geometry defects: the player's
expanded collision footprint could catch the upper slab before its feet reached
the old 3.5 cm tolerance, and the floor cutout extended 6 cm beyond the accepted
stair surface. The integration owner corrected those shared helpers, with
equivalent JS/Python behaviour. These tests deliberately cross both transitions;
ending a test while the player is still on the slope would miss them.

Verification completed against the integrated repository helpers: all 31 new
interior tests and all 54 existing layout tests pass. JavaScript syntax checks and
`git diff --check` pass. No temporary patched test helper is used by those results.

Limitations: this authored-content change alone does not mount a normal campaign
scene. Actual renderer and complete mission/save integration belong to the parent
workstream. No browser/GPU suite or physical iPhone/iPad playtest was run by this
workstream. New decorative bathroom fixtures do not introduce plumbing gameplay,
and non-bound internal doors remain open passages. New models are compact low-poly
CC0 furniture, not photogrammetry or a device-performance claim.

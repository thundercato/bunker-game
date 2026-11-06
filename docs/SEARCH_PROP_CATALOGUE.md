# Searchable prop catalogue

6 November 2026. Candidate implementation, not a published gameplay release.

`site/search-props.json` defines **69 semantic variants**: **65 original composite models** and **four verified, already-shipped CC0 Poly Haven models**. Original composites have distinct geometry/layout signatures when vertex colours are omitted. They include cabinets, drawers, wardrobes, desks, working-room kitchen fixtures, bathroom storage, lockers, safes, filing, tools and cargo. They are not 69 downloaded assets. The new Kenney campaign furnishing library is a separate collection with its own registry/licences.

## Runtime contract

```js
import {
  loadSearchPropCatalogue, createSearchProp, setSearchPropOpen,
  searchPropCollider,
} from './search-props.js';
const catalogue = await loadSearchPropCatalogue();
const descriptor = catalogue.props.find(p => p.id === container.searchProp);
const model = await createSearchProp(descriptor.id, {library, catalogue});
// model is an independent THREE.Group: bottom-centre, +Y up, +Z front, metres.
// Apply the container/building's authored transform exactly once.
setSearchPropOpen(model, searched ? 1 : 0);
const collider = searchPropCollider(descriptor, {x, y: floor, z, yaw});
```

`getSearchProp(id, {catalogue})` is async. `validateSearchPropCatalogue(data)` and `searchPropCollider(descriptor, pose)` are pure. `createSearchProp(id, {library, materials, catalogue})` accepts an optional compatible `AssetLibrary` with `get(id)`. It uses raw named meshes for the four licensed models so source doors/drawers/lids can move independently. It never reparents or mutates the cached source. Missing files or named parts produce a working original fallback; `model.userData.searchProp` records `renderSource`, `sourceAsset`, mesh/triangle counts and `fallbackReason` where applicable. Imported source orientation remains the verified source orientation.

Each instance owns its transforms. Default templates share geometries and materials; do not dispose those resources per instance. The catalogue is cached after a successful fetch; failed fetches can retry. `setSearchPropOpen` clamps progress to 0–1 and is idempotent, reversible and stateless. Drive it from the existing searched flag/animation rather than adding a second saved search state. The primary drawer/bin opens in large compartment units; the remaining fronts stay in the static batch.

Original geometry supports per-slot Three.js material overrides through `materials: {body, front, trim, dark, edge, metal, paper, mark, glass}`. Custom materials bypass default template caching and retain the material objects. Default composites bake nine palette families into vertex colours and merge each stationary/movable assembly into one mesh. Their glass/mirror panels use opaque smoky surfaces to avoid sorting costs. Source-model textures keep their original authored materials; the per-slot overrides apply to composite geometry, including fallbacks. Palette/slot metadata is descriptive; changing the JSON default palette produces the corresponding original model on the next application load.

## Integration and save protection

The metadata `profile` recommends a legacy loot profile for **new authoring**. A visual replacement must retain the existing container ID, actual loot profile, capacity, guaranteed items, mission links and saved contents. This module does not generate loot, write storage, create containers, change reach rules or override mission logic. `editor.asset` equals the stable `search_*` ID; `editor.bindingType` requires a `container` binding and an existing container ID. A decorative editor placement does not automatically create searchable gameplay state.

Use one descriptor/instance size for rendering and the simplified closed box collider. The collider helper provides the rotated world AABB; preserve authored yaw for the engine's precise local footprint test where available. Door/lid/drawer details do not add separate collision solids. Metadata anchors are local suggested search points for newly authored instances; retain or intentionally transform existing physical search anchors. Wall variants are bottom-centred too: apply their authored mounting height externally. Rotation/translation belongs to the container/building owner and must be applied once to model, collision and anchor.

Register all IDs with layout validation/rendering and editor lists, support `search_*` assets before the generic glTF loader, update normal-game furniture replacement to avoid re-replacing them with the v10 generic cabinet, and include this module and JSON in offline precache/build validation. Catalogue entries alone do not place 69 targets in every room. The parent integration curates meaningful variants for the existing 139 stable containers and room purposes.

## Geometry and source budgets

All 69 composite/fallback templates together contain **4,289,472 bytes (4.09 MiB)** of position/normal/UV/colour arrays, before renderer overhead; templates are lazy and reused. There are no new composite texture downloads. The per-template original geometry maximum is **3,228 triangles**, with **2–5 mesh submissions**; most originals contain fewer than 900 triangles. These are geometry/render submission counts, not measured device frame rates. Custom material overrides can increase submissions. The four real imported source models contain 2,227–6,576 triangles and 3–7 meshes; source textures/files are already part of the repository.

| Runtime variant | Source / author | Licence | Source triangles | File bytes | Actual meshes |
| --- | --- | --- | ---: | ---: | ---: |
| `search_salvaged_cabinet` | [Painted Wooden Cabinet](https://polyhaven.com/a/painted_wooden_cabinet) / Kirill Sannikov | CC0-1.0 | 2,227 | 165,896 | 5 |
| `search_vintage_drawers` | [Vintage Wooden Drawer 01](https://polyhaven.com/a/vintage_wooden_drawer_01) / James Ray Cock | CC0-1.0 | 5,184 | 291,268 | 7 |
| `search_salvaged_crate` | [Wooden Crate 01](https://polyhaven.com/a/wooden_crate_01) / James Ray Cock | CC0-1.0 | 6,576 | 271,280 | 3 |
| `search_field_medical_case` | [Medical Box](https://polyhaven.com/a/medical_box) / Ulan Cabanilla | CC0-1.0 | 3,718 | 217,920 | 5 |

Existing source modifications: textures reduced to 384 pixels and unused animation data omitted (see `site/assets/v10/model-manifest.json`). This implementation normalises whole model bounds and makes named source parts movable at runtime. The catalogue records exact source URL, author, licence and changes. Original geometry is project source, with no third-party model/texture dependency; this document does not invent or change a repository licence.

## Verified catalogue

Dimensions are closed width × total height × depth in metres, including handles/taps/feet after normalisation. Category/recipe differences include multiple cupboard layouts, real corner geometry, nested panels, plinths/legs, drawer grids, rails, louvres, office pedestals, basin rims/drainers/taps, gas/electric rings, appliance glazing/controls, vents, safe dial/keypad, drawer labels, workbench pegboard/tools, castors, crate bracing, cargo corrugation, drum rims and zip/strap details. `rooms`, `mount`, interaction and collision metadata remain machine-readable in the JSON.

| Stable asset ID | Searchable form | Recommended rooms | Dimensions | Composite triangles / meshes |
| --- | --- | --- | --- | ---: |
| `search_wall_cupboard` | Single wall cupboard | kitchen, storeroom | 0.72 × 0.85 × 0.38 | 180 / 2 |
| `search_double_wall_cupboard` | Double wall cupboard | kitchen, canteen | 1.08 × 0.8 × 0.38 | 276 / 3 |
| `search_glazed_wall_cabinet` | Glazed crockery cabinet | kitchen, canteen | 0.9 × 0.94 × 0.4 | 264 / 3 |
| `search_corner_wall_cabinet` | Corner wall cupboard | kitchen | 0.72 × 0.9 × 0.55 | 96 / 2 |
| `search_utility_cabinet` | Utility cupboard | storeroom, workshop | 0.8 × 1.2 × 0.5 | 300 / 3 |
| `search_sideboard` | Dining sideboard | living, canteen | 1.35 × 0.9 × 0.47 | 528 / 4 |
| `search_bedside_drawers` | Bedside two drawer stand | bedroom, refuge | 0.48 × 0.58 × 0.42 | 300 / 2 |
| `search_chest_drawers` | Chest of drawers | bedroom, living | 0.85 × 1.05 × 0.48 | 492 / 2 |
| `search_wide_dresser` | Wide bedroom dresser | bedroom | 1.35 × 0.9 × 0.5 | 684 / 2 |
| `search_apothecary_drawers` | Apothecary specimen drawers | clinic, laboratory | 1.1 × 1.05 × 0.44 | 3,228 / 2 |
| `search_card_index` | Card index cabinet | office, station | 0.74 × 0.86 × 0.42 | 2,040 / 2 |
| `search_wardrobe_single` | Single wardrobe | bedroom, refuge | 0.8 × 1.95 × 0.6 | 256 / 2 |
| `search_wardrobe_double` | Double wardrobe | bedroom | 1.2 × 2.0 × 0.62 | 364 / 3 |
| `search_linen_press` | Louvred linen press | bedroom, bathroom | 0.95 × 1.8 × 0.54 | 540 / 3 |
| `search_broom_cupboard` | Broom cupboard | kitchen, workshop | 0.65 × 1.85 × 0.5 | 220 / 2 |
| `search_writing_desk` | Writing desk with drawer | bedroom, office | 1.15 × 0.79 × 0.6 | 168 / 2 |
| `search_pedestal_desk` | Single pedestal desk | office, station | 1.35 × 0.8 × 0.65 | 372 / 2 |
| `search_office_desk` | Twin pedestal office desk | office, military | 1.6 × 0.8 × 0.72 | 672 / 3 |
| `search_rolltop_desk` | Roll top clerk desk | office, station | 1.2 × 1.14 × 0.67 | 432 / 2 |
| `search_kitchen_base` | Kitchen base cupboard | kitchen, canteen | 0.9 × 0.9 × 0.6 | 276 / 3 |
| `search_kitchen_drawers` | Kitchen drawer base | kitchen, canteen | 0.6 × 0.9 × 0.6 | 372 / 2 |
| `search_kitchen_pantry` | Tall pantry cupboard | kitchen, canteen | 0.7 × 1.95 × 0.6 | 516 / 5 |
| `search_sink_unit` | Kitchen sink cupboard | kitchen, canteen | 1.1 × 0.93 × 0.62 | 608 / 3 |
| `search_double_sink` | Double basin wash unit | kitchen, workshop | 1.3 × 0.95 × 0.64 | 648 / 3 |
| `search_gas_cooker` | Four ring gas cooker | kitchen, canteen | 0.62 × 0.92 × 0.6 | 620 / 2 |
| `search_electric_cooker` | Solid hob electric cooker | kitchen, refuge | 0.62 × 0.9 × 0.62 | 908 / 2 |
| `search_tall_fridge` | Two compartment refrigerator | kitchen, clinic | 0.66 × 1.75 × 0.65 | 276 / 3 |
| `search_under_counter_fridge` | Under counter refrigerator | kitchen, canteen | 0.6 × 0.85 × 0.6 | 216 / 2 |
| `search_chest_freezer` | Chest freezer | kitchen, storeroom | 1.2 × 0.9 × 0.65 | 204 / 2 |
| `search_microwave_cabinet` | Microwave oven cupboard | kitchen, office | 0.68 × 0.54 × 0.44 | 376 / 2 |
| `search_medicine_cabinet` | First aid wall cabinet | clinic, bathroom, refuge | 0.62 × 0.7 × 0.24 | 192 / 2 |
| `search_mirror_cabinet` | Bathroom mirror cabinet | bathroom | 0.65 × 0.78 × 0.22 | 156 / 2 |
| `search_basin_vanity` | Washbasin vanity cupboard | bathroom, clinic | 0.72 × 0.9 × 0.53 | 536 / 3 |
| `search_linen_hamper` | Lidded linen hamper | bathroom, clinic | 0.5 × 0.7 × 0.46 | 288 / 2 |
| `search_medical_trolley` | Medical supply trolley | clinic, laboratory | 0.68 × 0.93 × 0.48 | 520 / 2 |
| `search_locker_single` | Vented single locker | military, refuge, workshop | 0.46 × 1.9 × 0.52 | 300 / 2 |
| `search_locker_double` | Two bay changing locker | military, workshop | 0.85 × 1.85 × 0.52 | 432 / 3 |
| `search_locker_split` | Four compartment locker | military, station | 0.85 × 1.8 × 0.5 | 792 / 5 |
| `search_footlocker` | Military footlocker | military, refuge | 0.92 × 0.46 × 0.48 | 192 / 2 |
| `search_arms_locker` | Locked equipment cupboard | military, workshop | 1.04 × 1.9 × 0.5 | 696 / 3 |
| `search_floor_safe` | Floor standing safe | office, military | 0.68 × 0.92 × 0.62 | 332 / 2 |
| `search_wall_safe` | Recessed wall safe | office, bedroom | 0.55 × 0.55 × 0.25 | 288 / 2 |
| `search_cash_box` | Portable cash strongbox | office, shop | 0.4 × 0.19 × 0.3 | 196 / 2 |
| `search_filing_two` | Two drawer filing cabinet | office, station | 0.46 × 0.76 × 0.58 | 324 / 2 |
| `search_filing_four` | Four drawer filing cabinet | office, military | 0.46 × 1.35 × 0.6 | 588 / 2 |
| `search_filing_lateral` | Lateral filing cabinet | office, station | 1.03 × 0.8 × 0.48 | 324 / 2 |
| `search_document_sorter` | Pigeonhole document sorter | office, station | 0.95 × 1.1 × 0.38 | 540 / 2 |
| `search_map_drawers` | Plan and chart drawers | office, military, station | 1.22 × 0.8 × 0.86 | 720 / 2 |
| `search_tool_workbench` | Drawer workshop bench | workshop, military | 1.5 × 1.3 × 0.66 | 852 / 2 |
| `search_rolling_toolchest` | Rolling mechanics tool chest | workshop, garage | 0.8 × 1.0 × 0.48 | 832 / 2 |
| `search_wall_tool_cabinet` | Wall hung tool cupboard | workshop, garage | 0.9 × 0.72 × 0.25 | 444 / 3 |
| `search_cantilever_toolbox` | Cantilever toolbox | workshop, garage | 0.6 × 0.32 × 0.3 | 228 / 2 |
| `search_electrical_cabinet` | Electrical spares cabinet | workshop, military, station | 0.65 × 1.0 × 0.3 | 204 / 2 |
| `search_parts_bins` | Small parts storage bins | workshop, garage | 0.9 × 0.9 × 0.4 | 828 / 2 |
| `search_slatted_crate` | Slatted produce crate | storeroom, dock, shop | 0.85 × 0.6 × 0.6 | 276 / 2 |
| `search_reinforced_crate` | Reinforced shipping crate | storeroom, dock, military | 1.15 × 0.85 × 0.75 | 336 / 2 |
| `search_ammo_chest` | Ammunition transit chest | military, workshop | 0.85 × 0.4 × 0.43 | 252 / 2 |
| `search_travel_trunk` | Banded travel trunk | bedroom, station | 0.9 × 0.55 × 0.5 | 276 / 2 |
| `search_shipping_container` | Short cargo container | dock, industrial | 2.4 × 2.25 × 2.15 | 612 / 3 |
| `search_salvage_drum` | Lidded salvage drum | dock, industrial, workshop | 0.6 × 0.88 × 0.6 | 456 / 2 |
| `search_water_barrel` | Potable water storage barrel | storeroom, camp | 0.5 × 0.72 × 0.5 | 424 / 2 |
| `search_suitcase` | Traveller suitcase | bedroom, station | 0.68 × 0.24 × 0.45 | 144 / 2 |
| `search_kitbag` | Zipped equipment kitbag | military, camp | 0.7 × 0.33 × 0.36 | 144 / 2 |
| `search_cooler` | Insulated provisions cooler | kitchen, camp | 0.6 × 0.42 × 0.38 | 168 / 2 |
| `search_archive_shelf` | Archive box shelving | office, storeroom | 0.98 × 1.4 × 0.42 | 456 / 2 |
| `search_salvaged_cabinet` | Salvaged painted cabinet | living, canteen | 1.35 × 0.9 × 0.47 | 528 / 4 |
| `search_vintage_drawers` | Vintage six drawer dresser | bedroom | 1.35 × 0.9 × 0.5 | 684 / 2 |
| `search_salvaged_crate` | Salvaged timber transit crate | storeroom, dock, military | 1.15 × 0.85 × 0.75 | 336 / 2 |
| `search_field_medical_case` | Field medical transit case | clinic, military, refuge | 0.48 × 0.28 × 0.32 | 168 / 2 |

## Verification and limits

`node site/tests/test_search_props.mjs` passes **83 checks**: metadata/recipe safety, 69 actual composite instantiations, exact bottom-centred bounds, collision at 90°, independent clones, reversible openings, no colour-only duplicate originals, finite geometry, submission/triangle budgets, custom material isolation, nested pane colour preservation, solid lidded-container fronts, actual source GLB/node availability and licence matching, immutable imported sources, missing-source/part fallback, and no mutation of catalogue/gameplay fields. `node --check site/search-props.js` passes.

A real Chromium/SwiftShader contact sheet rendered all 69 entries, including all four real GLB files (no fallbacks), with zero page errors. Visual inspection found and corrected missing front panels on lidded composites and lost detail colours during nested merging; dedicated regressions cover both. The refreshed temporary capture is `/tmp/search-prop-catalogue.png`, with actual runtime counts in `/tmp/search-gallery-stats.json`; the parent campaign owns copying these into durable verification artefacts and whole-game screenshots/tests.

This module's test does not claim full-game placement, search reach, mission/save integration, offline upgrades, controller/mobile layout or physical Apple-device frame-rate validation. Those belong to the parent integration and browser suites. Moving decorative parts use simplified hinge locations, and the small glazed/mirror panels are stylised opaque surfaces. Future refinements can replace an original recipe with a verified source asset without changing its stable catalogue ID or existing container binding.

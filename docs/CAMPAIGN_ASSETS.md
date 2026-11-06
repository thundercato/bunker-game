# Campaign licensed asset preparation, 6 November 2026

91 real low-poly CC0 models are prepared in `site/assets/campaign/`: 50 furniture
models, nine industrial models, 17 survival/camp/workshop models, seven railway
models and eight street/infrastructure models. The selected geometry totals
27,142 triangles, 1,344,660 runtime GLB bytes, four shared 256 × 256 atlas textures
(16,037 compressed bytes), and 91 small actual-geometry thumbnails. The source
GLBs for the same selection total 2,300,444 bytes: the prepared GLBs are 41.5%
smaller without removing triangles. This is an asset catalogue budget, not a
measurement of a rendered game scene.

The entire directory is approximately 1.91 MB including the detailed registry,
contact sheet, credits and thumbnails. Each GLB contains one indexed primitive,
one material and one static closed pose. This keeps an individual imported prop
to one draw call before renderer instancing. Different instances still require
renderer reuse/instancing; these files do not themselves provide that integration.

The sources are Kenney's Furniture Kit 2.0, City Kit Industrial 2.0, Survival Kit
2.0, Train Kit 1.1 and City Kit Roads 2.2. The actual downloaded ZIPs total
20,242,857 bytes. Each provider page identified CC0 and every archive contains an
explicit CC0 licence. Verbatim evidence, exact authors and links are in
[`CREDITS.md`](../site/assets/campaign/CREDITS.md); the Train Kit's additional
credits to Guus Vermeulen and Tony Schaer are retained. Existing Poly Haven models
were inspected first and are not duplicated by this import.

## Reproduce and validate

Source masters are at `/workspace/asset-source-masters` in the current workspace,
outside both the repository and `site/`. Their immutable hashes are committed in
`site/assets/campaign/sources.json`, so an unverified provider update is rejected.
The archive bytes themselves are not needed to build or run the game. Downloads
use the provider's public page and signed download flow with its page referrer;
calling `download-link` without that referrer returned HTTP 403 during research.
The separate guessed `construction-kit` page returned HTTP 404. No crane was
downloaded or claimed from these packs.

```sh
# The import step needs Python and Pillow. Shipping verification needs only Python.
python3 tools/import_campaign_assets.py --masters /workspace/asset-source-masters --download --import --verify
python3 tools/import_campaign_assets.py --verify
python3 tools/import_campaign_assets.py --blender-verify
python3 -m py_compile tools/import_campaign_assets.py
```

The importer does not extract an untrusted ZIP wholesale or execute pack scripts.
It selects exact GLB members from hash-locked archives. `--verify` checks model
hashes/lengths, unique IDs, triangle counts, valid indices, finite geometry,
ground pivots, one primitive/material, texture paths, thumbnails and copied
licence evidence. It runs without network access or Pillow. Regeneration is
deterministic. A provider archive change needs explicit provenance review and
updating the lock; do not replace the hashes merely to silence an error.

## Registry and integration

Load `assets/campaign/registry.json` and use its **`assets` array**, not the root
object. Each row has a stable `campaign_…` ID and site-relative `path`. Register
those paths in `AssetLibrary.files` and request only the models used in a scene.
Example entries include:

| ID | Dimensions, metres (width × height × depth) | Triangles |
| --- | --- | --- |
| `campaign_lounge_sofa` | 1.917 × 0.900 × 0.802 | 128 |
| `campaign_bed_single` | 0.990 × 0.650 × 1.950 | 214 |
| `campaign_kitchen_fridge` | 0.865 × 1.850 × 0.587 | 250 |
| `campaign_kitchen_sink` | 0.790 × 0.900 × 0.827 | 318 |
| `campaign_shipping_container_a` | 2.772 × 2.590 × 6.121 | 402 |
| `campaign_water_tower` | 3.581 × 9.000 × 3.496 | 968 |
| `campaign_railroad_straight` | 2.200 × 0.220 × 8.800 | 376 |
| `campaign_train_carriage_box` | 3.329 × 3.600 × 7.490 | 1,076 |

Meshes use +Y up, a bottom-centre origin and baked uniform metre scale. The
furniture's front faces -Z. Registry rows include the original bounds/applied
scale/yaw. A railway model's origin is centred along its length; a renderer laying
track must account for the 8.8 m segment length and align collision independently.
Container colour variants are deliberate skins of the same geometry. The
industrial tank and water tower are decorative closed meshes, not enterable rooms.

`searchableSuitable` is an authoring hint for 49 source models. `interaction` is
deliberately null: a model needs a stable existing container ID, reachable anchor,
capacity and loot binding before it becomes gameplay. Static merged doors cannot
be animated separately; use the semantic prop system's movable parts or prepare
a future articulated tier. The playable catalogue's 50+ interaction variants is
a separate implementation, not a claim that these 91 imports add 91 searches.

Use `collision` hints deliberately. Most furniture supports a box proxy. Do not
use a whole-object AABB for fence doorways, tents or railway running surfaces: it
would block their openings. Small fixtures have no collision hint. No automatic
mesh collision, climbability or interaction anchors are added by the importer.

Four shared atlases cost an estimated **1,398,100 decoded RGBA bytes including
mipmaps** if all are loaded. Count each `textureSharing` value once, rather than
summing that estimate over every model. Geometry GPU estimates cover positions,
normals, UVs or vertex colours and indices; they exclude renderer overhead,
instances and driver allocations. Materials are matte and opaque, including
formerly transparent glass, to avoid extra transparent passes in this tier.
No separate LOD mesh or measured device frame-rate claim is made; existing scene
culling/instancing and a fallback remain necessary.

Use `thumbnail` for editor library previews. The optional
`assets/campaign/catalogue-preview.webp` contact sheet is generated from these
prepared meshes using the importer's depth-buffered software rasteriser. It is
not a game screenshot. Offline integration must include models **and their four
external atlas textures**, registry/credits and relevant thumbnails. Loading all
models at startup is unnecessary.

## Verification boundary

The initial import and subsequent shipping verification passed for all 91 files,
including a run with `python3 -S` proving no optional Python package is required.
All triangles were checked against their vertex normals: no reversed winding was
found. The already-installed Blender 4.3.2 independently imported all 91 GLBs,
confirming one mesh/material and exact triangle totals for each. No engine or
toolchain was installed. Reimporting reproduced all 187 GLB, texture and preview
files byte-for-byte. Source primitives would require 261 draw calls in a
catalogue containing one copy of each; the prepared tier requires 91 before
instancing. Actual game placement, search bindings, gameplay collision, browser
offline loading and mobile/controller behaviour are integration responsibilities.
The parent campaign records those results separately; catalogue preparation is
not a production publication or a device benchmark.

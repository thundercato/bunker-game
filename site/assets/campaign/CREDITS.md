# Campaign model credits

Acquired and checked 6 November 2026. These are actual downloaded models, not
generated replacements or a promise of future downloads. Every pack's original
licence file is copied verbatim into `licences/`. All five packs are released
under [Creative Commons Zero 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

| Source pack | Creators credited by the pack | Evidence |
| --- | --- | --- |
| [Furniture Kit 2.0](https://kenney.nl/assets/furniture-kit) | Kenney | [Original licence](licences/furniture-kit.txt) |
| [City Kit Industrial 2.0](https://kenney.nl/assets/city-kit-industrial) | Kenney | [Original licence](licences/city-kit-industrial.txt) |
| [Survival Kit 2.0](https://kenney.nl/assets/survival-kit) | Kenney | [Original licence](licences/survival-kit.txt) |
| [Train Kit 1.1](https://kenney.nl/assets/train-kit) | Kenney; additional credits: Guus Vermeulen, Tony Schaer | [Original licence](licences/train-kit.txt) |
| [City Kit Roads 2.2](https://kenney.nl/assets/city-kit-roads) | Kenney | [Original licence](licences/city-kit-roads.txt) |

Field Signal modifications: selected a coherent subset; baked node transforms;
scaled uniformly to reference dimensions in metres; centred the ground pivot;
rotated the furniture family to face -Z; merged each static closed pose into one
draw call; removed unused vertices, tangents, UVs and unlit declarations; packed
16-bit indices and normalised vertex colours; gave models opaque matte materials
and subdued colours; reduced shared atlas textures to 256 pixels; generated
thumbnails from the actual optimised geometry. No triangle decimation, Draco or
meshopt decoder is required. Glass is intentionally opaque in this low-cost tier.

`registry.json` records each original archive member, author, source link, source
and runtime SHA-256, source/runtime file sizes, triangles, dimensions, material
counts, GPU memory estimates and collision hints. `sources.json` locks the five
ZIP archive hashes. Source masters remain outside the shipping site; the importer
in `tools/import_campaign_assets.py` can acquire and rebuild them.

Thumbnails and the catalogue contact sheet show the actual prepared meshes using
a deterministic software rasteriser. They are catalogue previews, not screenshots
of game placement or evidence of device performance. Loading a mesh does not
create a loot container or climbing interaction.

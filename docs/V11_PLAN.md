# V11 environmental overhaul

Requested by Adam: replace the blocky world appearance with licensed realistic trees, vehicles and buildings, preserving the v10 game. A native app may be evaluated later; this release remains a browser build.

## Implementation targets
- Game-ready conifers derived from licensed source meshes, with distance-dependent rendering rather than millions of triangles per tree.
- Detailed abandoned vehicle geometry, preserving existing searchable vehicles and collision footprints.
- Weathered building skins, pitched roofs, proper entrance surrounds, facade modules and varied settlement silhouettes. Preserve all existing doors, interiors and stairs; do not replace traversable buildings with sealed scans.
- Real scanned rocks, stumps, deadwood and ferns, with restrained density and local assets.
- Keep all 61 inventory previews, the atlas, mission shortcuts, v9 save schema/storage key, and the calm Relay Lanterns refuge music.

## Verification and publication gates
- Every downloaded model must have a recorded origin and redistribution licence. Heavy source assets are not runtime assets.
- Existing rules and map/inventory checks must remain green.
- Test new renderer, missing-asset handling, vehicle search, doors/stairs, terrain grounding and LOD transitions.
- Compare actual screenshots, not just console output.
- Commit on this branch, pass CI, merge, then verify the actual GitHub Pages release before giving a v11 link.

No claim is made that a native wrapper alone improves models or performance. A later native proposal should be based on measured memory, graphics and control requirements.

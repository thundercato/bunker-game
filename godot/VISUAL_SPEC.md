# Bunker Game pixel-art specification

## Grid and scaling

- Logical art grid: 320 x 180, presented at 4x inside the 1280 x 720 design viewport.
- Bunker tiles: 32 x 32. Maze tiles: 48 x 48. Entity frames: 32 x 48.
- Textures use nearest-neighbour filtering. World transforms and vertices snap to the pixel grid.
- Gameplay positions remain floating point for smooth analogue movement; presentation rounds sprite destinations and camera motion to quarter-world-pixel increments.

## Palette and material rules

- Near-black ink and void: `#080b0c`, `#070b0f`.
- Concrete: `#172024`, `#263238`, `#354248`, `#536168`.
- Military green: `#1c2a21`, `#354b39`, `#58705a`.
- Timber and rust: `#2c1e16`, `#5c3c25`, `#8a4a2c`.
- Readability accents: amber `#d1a14e`, cream `#ead9a4`, health red `#a74436`, water blue `#4c8191`.
- Interactive silhouettes use a one-pixel dark outline and a restrained light-facing edge. Decoration must not share the amber interaction accent.

## Lighting and density

- Environmental light falls from the upper wall direction and uses warm amber practical fixtures.
- Maze visibility is a small cross-corridor pool plus a longer facing beam, both contained by the maze grid.
- Cracks, damp, rust, seams and floor wear are sparse deterministic variants. Collision edges, doors, enemies, pick-ups and routes always win the contrast hierarchy.

## UI

- Bundled monochrome bitmap font, dark distressed panels, 44-pixel minimum modal actions and 52 to 58-pixel gameplay actions.
- Normal gameplay retains an open centre. Modal overlays block pointer input and release held joystick/run state.
- HUD and controls are laid out from the live landscape viewport, with edge margins retained across representative iPhone and iPad aspect ratios.

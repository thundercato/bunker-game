# Stillwater v8 asset and technical credits

The imported model and music licences from Relay Refit v7 are retained in V7_CREDITS.md and in the individual source manifests. The runtime model packs now contain only the modules actually placed in the world. This changes packaging, not the licence or authorship.

## Added material and geometry

Concrete Wall 008 by Charlotte Baglioni (photography) and Dario Barresi (processing), Poly Haven, CC0 1.0. Source: https://polyhaven.com/a/concrete_wall_008 . Licence: https://polyhaven.com/license . Colour map reduced to 768 pixels and normal map to 512 pixels, tinted and re-tiled for the base. Original files and a source note are retained under assets/v8.

Three.js RoundedBoxGeometry from release r170, MIT, is used for the authored mattress and pillow. The full Three.js licence remains in vendor/THREE-LICENSE.txt.

The rebuilt base shell, floor/shelf placements, window frames, gutters, kerbs, rounded bunk geometry, dust particles, waypoint UI and controller tools are authored for Field Signal. No new proprietary game assets are included. The earlier concept images remain art direction, not screenshots of the playable renderer.

## Research informing the changes

- W3C Gamepad specification: https://www.w3.org/TR/gamepad/
- WebKit iOS26 controller focus fix: https://commits.webkit.org/298992@main
- WebKit iPad fullscreen controller issue: https://bugs.webkit.org/show_bug.cgi?id=311151
- Three.js camera depth precision: https://threejs.org/manual/en/cameras.html
- Three.js materials and polygon offsets: https://threejs.org/docs/#api/en/materials/Material
- Three.js texture filtering: https://threejs.org/docs/#api/en/textures/Texture
- Three.js shadow-map trade-offs: https://threejs.org/manual/en/shadows.html

These references informed a repair and diagnostic strategy. They do not prove the cause of a controller problem on a particular iPhone. This release does not force fullscreen, does not claim to override operating-system restrictions and does not auto-upload controller reports.

## Runtime scope

Controller Clinic reads the native browser API before the game engine loads. Input can be tested with no Python, Three.js or game mappings. A Linux WebKit test was performed in addition to Chromium, but this is not a test of a physical iPhone, iPad, USB accessory or Bluetooth controller.

Build-only geometry-union software and downloaded browser testing runtimes are not distributed with the game. No font files or credentials are distributed.

# Overgrowth v11 credits

The v7-v10 credits and source manifests remain applicable. All new runtime assets are included locally. No new model depends on an expiring download URL.

## Forest

Two game-ready pine meshes were baked with **EZ-Tree 1.1.0**, by **Daniel Greenheck**, under the MIT licence. They use configured branch structure and the library’s included bark/needle images, scaled to 14 metres and exported with local textures. Distant representations are actual transparent renders of these same trees. They are procedurally generated 3D meshes, not scans and not the enormous raw Poly Haven pine mesh. The MIT notice is in `assets/v11/EZ-TREE-LICENSE.txt`. Source: https://github.com/dgreenheck/ez-tree

**Dead Tree Trunk 02**, **Tree Stump 01**, **Rock Moss Set 01** and **Fern 02** are Poly Haven CC0 assets. Their authors, original URLs and transformation records are in `assets/v11/models.json`. Scanned rock, stump and trunk geometry was simplified with glTF Transform and meshoptimizer. Texture maps were resized for mobile. Source licensing: https://polyhaven.com/license

## Vehicles

**Crashed Abandoned Car (Game Ready)** by **Rashad Ibrahimli** is used under **CC BY 4.0**. https://sketchfab.com/3d-models/crashed-abandoned-car-game-ready-66ef51a84c9843dda53bf0b4b9020011
Licence: https://creativecommons.org/licenses/by/4.0/
The separately credited vehicle was obtained from a public redistribution at https://github.com/RohanVashisht1234/threejs-zombieshooter-game/blob/main/public/map.glb . Only the matching `Object_12001` vehicle mesh and its required material/texture were extracted. No other scene assets from that file are shipped. Changes: decompression, extraction, resizing, orientation and in-game colour variation. Attribution does not imply endorsement.

**Covered Car** by Poly Haven is CC0. Its individual artist attribution and source are in the manifest. Two of the eight searchable vehicles use that covered-car model; the others use the damaged SUV. They remain searchable scenery, not driveable vehicles.

## Buildings and surfaces

**Modular Urban Apartments Facade** from Poly Haven is CC0. Its selected window and plaster modules supplement authored traversable building shells. Old Planks 02, Damaged Plaster, Brick Wall 001, Grey Roof Tiles and Rusty Corrugated Iron provide local colour, normal and roughness maps. Artists and sources are recorded in `assets/v11/surfaces.json`.

Pitched roof meshes, one hangar’s arched roof, entrance canopies, structural supports and collision interiors are original game geometry. This release is not a claim that every house is a downloaded complete building, nor that every modular facade has a matching prefabricated interior. Existing doorway widths, stairs, search locations and mission coordinates are preserved.

## Tools

Three.js r170 remains MIT, with its existing full licence in vendor. glTF Transform and meshoptimizer were build-time optimisation tools; EZ-Tree was used at build time, not generated repeatedly on the phone. Their package manager cache, browsers, font files and unrelated downloaded scenes are not shipped.

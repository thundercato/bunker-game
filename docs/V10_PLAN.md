# Field Signal: Fieldcraft v10

Development branch: `field-signal-v10`. Base: verified v9 main commit `09e4849642c6ad2f28aef9e5324e10549705da6a`. Keep main playable until tests pass.

## User priorities

1. Find and import more royalty-free, atmosphere-matching 3D models for tables, cabinets, drawers, beds, building details and carried objects.
2. Show a real model-rendered thumbnail for every inventory/loot item, reusing models in the world where appropriate.
3. Offer a larger item inspector with rotation, zoom and readable item information.
4. Provide a full-screen map with pinch/button zoom, pan, player/objective centring and a quick mission shortcut.
5. Preserve v9 gameplay, saves, calmer refuge music and controller diagnostics.

## Implementation rules

- Source imported assets from verified permissive libraries and record creators, licence, source and modifications. Distinguish authored game-specific geometry from downloaded models. Do not claim every object has an externally sourced model.
- Reuse geometry/materials, render thumbnails once, avoid a WebGL renderer per inventory slot, cap texture sizes and keep assets local for offline play.
- Decorative replacements must not obscure interaction targets, block doorways or change loot rules. Retain tested collision shells for buildings.
- Preserve compatible v9 saves rather than forcing a restart.
- Add tests for map transforms, touch input, inspector lifecycle, item coverage, memory/resource reuse, model load failures and mission targeting.
- Publish only after CI and checks of the actual GitHub Pages address; keep the README, credits and roadmap current.

## Status

Source and GitHub access confirmed. Asset selection and implementation underway. This document is a checkpoint, not a release claim.

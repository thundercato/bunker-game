# Field Signal roadmap

## Overgrowth v11

The current development branch implements the approved environmental upgrade while preserving the v10 gameplay and saves. Publication is a separate gate recorded in RELEASE_11.0.md.

- Fuller, irregular pine meshes with distance-based rendering.
- Real damaged/covered vehicle models with retained search interactions.
- Weathered exterior materials, imported windows, varied roofs and 37 preserved traversable buildings.
- Scanned natural ground details and bounded instancing.
- Persistent provenance, regression tests, automated deployment and unchanged campaign schema.

## After this release

1. Physical-device feedback: record frame rate, heat, memory symptoms, controller identity and problem locations on Adam’s actual iPhone and iPad. A successful headless test is not a hardware benchmark.
2. World polish: improve abrupt detail transitions, terrain variation, ground cover, building trim and the remaining authored props. Expand vehicle variety beyond the two current sources only when licences and budgets are verified.
3. Native app evaluation: keep this browser release playable; create a separate branch and a small representative scene. Measure graphics, input, loading and memory. Investigate how the existing Python rules, saves, UI and asset pipeline would be retained or migrated. A native app has not been built or selected yet.
4. Gameplay quality: richer enemy pathfinding, more varied missions and systematic indoor encounters before expanding the map further.
5. Architecture: reduce renderer inheritance layers, add scene-authoring/placement validation, and maintain reusable map, inventory and save tests.

## Working agreement

Keep main playable. Make development checkpoints. Preserve existing save keys unless an explicit migration is implemented. Verify the public release identity and real gameplay after deployment. Never describe a queued or failed build as live. Do not replace a functioning world with sealed models that lack doors and collision interiors.

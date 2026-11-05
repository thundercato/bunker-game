# Editor roadmap

## Implemented in v1
- Desktop browser editor at `/editor/`, separate from game UI.
- 37 building templates, 31 prop models and structural assemblies.
- Selection, gizmos, exact transforms, snapping, lock/hide, duplicate/delete and 80-step undo/redo.
- Perspective/overhead views, cutaway, roof/floor isolation and collision overlay.
- Shared collision and automatic stair cut-outs; local walk testing.
- Existing interaction IDs and loot surfaces move with their objects.
- Local per-building drafts, validated JSON import/export and a separate real-game preview campaign.
- Common layout warnings and non-destructive import/preview behaviour.

## Next, after using v1
1. Edit and approve Survey hut 03, a two-storey village house and the station.
2. Add multi-building approved layout manifests, versioned templates and in-game migration review.
3. Extend declarative scene coverage to Relay 07 and underground locations.
4. Add multi-selection, grouping and copy/paste across compatible buildings.
5. Improve façade/roof kits, surface snapping and advanced headroom/reachability checks.
6. Add explicit loot/spawn authoring without breaking existing mission IDs.
7. Consider authenticated GitHub proposals, never a personal token embedded in the static editor.

A native app is a separate runtime decision. Editable level data and asset provenance should remain portable either way.

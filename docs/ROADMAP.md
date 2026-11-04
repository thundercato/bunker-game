# Field Signal roadmap

## Release 9.0: Dead Air

The release candidate implements the recovered v8 foundation, permanent repository/build pipeline, a calmer base score, mission dossiers and archives, NPC jobs, continuous time, an expanded river-crossing region, garrison/sewer routes, vault transitions, hidden anomalies, riflemen, combat feedback, optional haptics and improved physical equipment.

### Verification gates

- [x] Recover v8 source and keep the retired game on an archive branch.
- [x] Commit a complete source checkpoint before continuing development.
- [x] Validate Python clock ratios, progression, ammunition, save migration and core survival rules.
- [x] Exercise real browser gameplay, vault movement, bridges, sewer branch and mission flows.
- [x] Capture all fifteen destination photographs and wire them to mission dossiers.
- [ ] Pass the automated repository CI pipeline for the final main commit.
- [ ] Verify the actual GitHub Pages deployment and offline loading.
- [ ] Obtain physical iPhone/iPad/controller playtest feedback.

The first two unchecked release gates are updated after deployment. Hardware playtesting remains an honest post-release task, not a reason to mislabel simulated tests.

## Next priorities

1. **Device feedback first:** investigate any controller report with actual device/browser details; record iPhone/iPad frame rates and memory use; tune quality presets against measured hardware.
2. **World robustness:** broader route and storage-reachability testing, better enemy pathfinding around furniture, more believable indoor stalking, and systematic checks of every building floor.
3. **Visual consistency:** replace the remaining authored blockout props where useful, improve held-weapon alignment and creature animation, reduce texture repetition, and refine lighting without exhausting mobile GPU budgets.
4. **Mission variety:** objectives beyond fetch/recovery jobs, reusable encounter logic, clearer NPC state, richer dialogue and carefully balanced rewards.
5. **Architecture:** split the layered renderer and large UI coordinator into stable systems; add content validation and scene-placement tooling; keep the deterministic Python core easy to test.
6. **Save lifecycle:** automatic local snapshots, better recovery UI and explicit per-release migration fixtures. Cloud saves would be a separate, consented feature.

## What is deliberately not claimed

- Photorealistic parity with the concept paintings.
- Native controller or haptic support on every iOS browser/device.
- A modelled asset for every individual inventory item: many existing consumables and furniture pieces remain authored geometry or icons.
- Sophisticated tactical navigation, destructible environments, multiplayer, voice conversations or full audio ray tracing.
- A completely seamless underground world: vault and sewer areas use explicit transitions.
- Authentic Ukrainian/Russian radio broadcasts: the playlist uses licensed atmospheric folk/synth recordings.
- Completion of future ideas not listed as implemented and tested.

## Working agreement

Keep `main` playable. Use feature branches for changes. Save small commits/checkpoints while working. Maintain the README, changelog, test report and credits alongside code. Never call an unpublished local build live. Record partial work and known defects honestly. Do not overwrite user saves or regenerate loot on every load.

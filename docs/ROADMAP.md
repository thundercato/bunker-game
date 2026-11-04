# Version 9: Dead Air

Status: recovery baseline preserved; unfinished v9 workspace recovered separately and under test.

## Required for this release

- Classified mission dossiers: scene image, actual game map, red target circle; active board and completed archive with timestamps.
- One starting radio contract; two offers after completion; NPC side quests; new-offer beeps and lamp.
- Continuous simulation: base clock 1:1; field clock 12:1; pause in menus/background.
- Less eerie base music, unchanged unsettling field ambience; multiple crackly radio stations with a proper AM/FM-style receiver.
- Muzzle flash, hit response, temporary wall impact marks, knife animation, context-sensitive secondary action, optional capability-tested haptics.
- Directional enemy perception, closed-building visibility, rifleman reposition/fire AI.
- Expanded world, bridges, railway, pylons, mountains, recoverable swamp boundary; military compound and alternate sewer route.
- Furnished and better-lit buildings; storage against walls; stairs and rooms; improved searching/door sounds.
- Hidden anomalies revealed by probes, detector sensing, reset on returning to base.
- Underground vault entrance with physical stair transition.
- Recover old saves where safe; preserve backups otherwise. Test under project-subpath hosting.

## Working rules

`main` is the published source of truth after release. Use a development branch and regular checkpoint commits. A release needs passing tests and a checked Pages URL. Never call a saved ZIP or a local screenshot a published release. Keep unfinished features explicitly listed rather than relabelling an older version.

## Longer-term

Native-device/controller playtests, further world decoration and performance tuning, broader gun catalogue, richer NPC conversations, accessibility refinements, deliberate economy balancing and a more modular renderer.

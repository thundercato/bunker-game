# Native-app evaluation, not started

Adam may choose a native app after playing v11. This release does not change platform.

A useful next comparison should reproduce one refuge room, one furnished enterable house, a forest patch at several detail distances, one mist enemy, a controller interaction and the item inspector. Keep the same assets and camera positions where feasible. Measure frame rate, peak memory, load time, battery/thermal behaviour and controller/haptic support on the actual devices.

Separate three decisions: a packaged browser app; a new native game-engine renderer; and a bespoke native renderer. They imply different migration costs. Do not assume that packaging alone removes the existing renderer’s bottlenecks.

Before choosing, make a migration inventory: Python rules and their tests, save schema and item IDs, mission data, asset licences, touch controls, the Atlas, inspector, offline assets and the source-of-truth GitHub workflow. Prototype on a separate branch and do not discard the working browser game.

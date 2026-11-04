# Dead Air v9 verification

## Results recorded before repository publication

- **67 Python tests passed:** 45 version-9 mechanics tests and 22 inventory, maintenance, storage, migration, art-manifest and supply regressions.
- **15 existing JavaScript unit tests:** controller deadzones/mapping, crossfade interpolation and click-safe loop splicing. The release pipeline re-runs these.
- **22 browser acceptance checks passed:** actual Python/WebGL boot, stationary base time, menu pause, initial mission and two-offer progression, NPC acceptance, archive timestamps, physical weapon collection, temporary impacts, walking out/up and back/down the vault stairs, faster field clock, probe-revealed anomaly, both river crossings, sewer branch, rear breach, new audio decoding and truthful unsupported-haptic reporting.
- **15 project-path browser checks passed:** served under `/bunker-game/`, with actual worker/assets, dossier image, controller routing, calm soundtrack decoding, earlier-save import, complete caching and offline reload.

These are test/scenario counts, not a claim to have tested that number of devices. Some suites overlap deliberately. Detailed results are in docs/verification; the GitHub workflow uploads its own current browser results.

The mission, radio, archive, NPC jobs, haptics, sound, display and save panels also passed a 16-case layout matrix at 1024×768 and 844×390 without page overflow or clipped primary controls.

## Defects found and repaired during this release

1. The continuous-tick scheduler could leave `tickBusy` true whenever the vault threshold was checked. The transition now queues safely behind an existing worker call rather than waiting for an idle frame that might never occur. Actual movement in both directions passed after the correction.
2. Pending simulation time could be discarded by a capped accumulator. A bounded time debt is now retained and consumed in valid worker increments. Menus and background states still pause rather than catching up hours of unseen gameplay.
3. The inherited creature builder also produced generic ghosts for the new riflemen. Those duplicate visuals/hitboxes were removed; the browser confirms one hitbox per enemy.
4. The unfinished mission image manifest was empty. All fifteen destinations were photographed from the real scene and connected to their dossiers. A shared placeholder is no longer used for every assignment.
5. The source was not durable. The complete v8 baseline was committed first, and v9 is transferred through a checksum-verified import before publishing.

## Sound change

The new base recording decodes to 128 seconds and is independently mixed from the existing field ambience and radio. Its source is original procedural composition, without external samples. The base drone scale is 2%, versus the prior generic indoor reduction of 9%. This is an implementation check, not a claim to have listened through the owner's phone speakers.

## Limitations and follow-up

No physical iPhone/iPad, mobile Safari hardware performance, USB gamepad or Bluetooth gamepad was available. Simulated button/axis tests establish game routing, not physical accessory compatibility. The independent Controller Clinic and haptic-capability test remain necessary diagnostic tools.

The browser tests used Chromium with software WebGL. A prior Linux WebKit pass validated the same input foundation, but this v9 test report does not relabel that as a new physical iOS test. Enemy navigation is simple and there is not yet an exhaustive automatic walk-through of every cupboard in every building. Larger-world mobile performance and rifleman/economy balance need playtesting.

The repository CI and actual public Pages deployment are verified separately before the final release claim. Do not treat this candidate report alone as proof that publishing succeeded.

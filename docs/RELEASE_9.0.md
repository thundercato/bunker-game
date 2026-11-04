# Dead Air v9.0.0: published release record

**Published and checked on 4 November 2026.**

Play: https://thundercato.github.io/bunker-game/
Controller Clinic: https://thundercato.github.io/bunker-game/controller.html
Deployed source: `6e468785f730946b23d4d8093b692e48c15f9739`
Release identity: `dead-air-9.0.0-20261104`

## GitHub publication

Workflow: https://github.com/thundercato/bunker-game/actions/runs/41879569378

The verification-job log records all 67 Python tests, all 15 input/audio unit tests and all 15 browser project-path checks passing. The deployment-job log reports Pages success at 17:50:06 UTC, with the expected public URL. Some API status summaries temporarily returned stale `queued` values; the completed logs and actual public site were checked instead of assuming publication from the queue state.

## Public-site checks: eight passed

1. Public `release.json` reports version 9.0.0 and the correct build identifier.
2. The actual published Python worker and all 26 licensed model families start without asset errors.
3. The new original refuge score, **Relay Lanterns**, decodes to 128 seconds on the public site.
4. The initial mission dossier loads its own destination photograph and map.
5. The live site's complete runtime successfully caches for offline play.
6. After disabling network access, the page reloads its Python simulation and saved campaign.
7. The public Controller Clinic opens offline, including its haptic-capability interface.
8. No JavaScript runtime exceptions were recorded during these checks.

## Additional tests

The broader local acceptance suite passed 22 gameplay scenarios, including mission progression, archive records, physical weapon pickup, temporary impacts, vault transitions, both bridges, sewer movement and the rear military breach. A 16-case layout matrix checked the new panels at tablet and landscape-phone sizes. Four fresh Linux WebKit checks passed for v9 startup, camera movement through the controller service, opening the backpack and absence of runtime errors.

The earlier candidate TEST_REPORT.md predates that final v9 WebKit run; this release record supplements it. Neither Linux WebKit nor simulated controller inputs are a physical iPhone, iPad or wired/Bluetooth accessory test. Mobile performance, real haptics and device-specific compatibility remain playtest limitations.

## Source and recovery

The retired Bunker Game is preserved at `archive/retired-bunker-before-field-signal`. A complete recovered v8 checkpoint was committed before the v9 migration. Current source, assets, licences, build tooling, documentation and portable tests are in this repository.

The release-candidate archive was SHA-256 verified before import:
`edc9d45049243e098703d433596258f443a385431f192e6ae73cc97252301148`

The public game does not depend on that archive host. Its models, audio and Python runtime are served from GitHub Pages. Documentation-only follow-up commits preserve this exact tested runtime.

## User-visible changes of note

The base score is calmer, not upbeat: soft sustained chords, sparse electric-piano notes and no percussion or threatening bass. Field ambience remains unsettling. The fifteen dossiers use true in-game reconnaissance screenshots, not newly generated AI photographs. Earlier v6/v7/v8 backups migrate through validation; cross-origin saves require export/import, not automatic transfer.

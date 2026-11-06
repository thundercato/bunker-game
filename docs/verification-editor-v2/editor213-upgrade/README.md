# Final 2.1.3 startup and package follow-up

Public source `e3719db` follows the full [2.1.3 acceptance](../editor213/README.md).
The sole changed public file is `editor/suite-bootstrap.js`; all other 597 public
files, including accepted gameplay/compiler/render/save/journal/audio code, have
identical hashes. The normal package remains 598 explicit files / 596 cache
resources, no overlay. [Exact hashes](package-provenance.json).

The later `7904360` campaign-harness correction is test-only and changes no public
bytes. See the campaign CI follow-up below; final-head normal CI remains required.

[CI42292276042](https://github.com/thundercato/bunker-game/actions/runs/42292276042)
passed all 14 editor browser suites (including strict 41 actual-game checks and
13 dense-history checks), then all three original offline variants. Starting the
fourth review-2.1.2 variant timed out after 120 seconds. Its exact cause remains
unconfirmed: five instrumented local repeats of that same original canonical
package passed all seven checks each. [Original failed-step log](logs/ci-42292276042-failure.log)
and [five repeat logs](logs/) preserve the observations.

The editor gate now reuses an installing/waiting worker and tolerates only
`InvalidStateError` during an update or redundant-controller handoff. It still
requires the actual expected controller cache before importing the application.
Genuine errors and wrong/unclaimed caches remain blocked; polling/timeout bounds
are unchanged. Nine deterministic lifecycle scenarios and the existing seven
preview-adapter scenarios pass. [Actual gate regression log](logs/activation-regression.log).
No game gate, runtime logic, cache label, save key or draft schema changed.

Offline failures now capture console errors, startup/worker/cache state and a
screenshot in CI output. HTTP/network errors and exceptions must be empty;
`cancelledRequests` separately records background requests aborted by explicit
workspace navigation. Those are retained in the reports rather than described
as missing assets. Online/offline workspace visits also settle their initial
network activity before moving on.

The package validator additionally compares all shipped bytes with canonical
source and rejects extra/private files. Existing package tests reject a changed
module, an extra test file and `.env`. CI revalidates the complete package after
all browser acceptance and immediately before artifact upload.

This managed workspace cannot unpack Actions artifacts: its storage-host CONNECT
returns HTTP 403 despite the reported unrestricted policy. CI logs are accessible.
Review the successful final-head `canonical-editor-dist` artifact linked from PR82;
its exact-byte verification runs inside CI. No local artifact-download claim,
merge or publication is made. Linux Chromium/SwiftShader is not physical-device
testing.

Final local follow-up on the exact `e3719db` package: **173 Python tests / zero
skips; all 16 editor pure suites; four offline variants 7/7 each; retained controls
9/9 and real-game editor/preview 31/31**. The post-browser byte check passes for all
598 files with no extras. [Machine summary](acceptance-summary.json) and [raw logs](logs/).
All exception, console-error, missing-resource and genuine network-failure arrays
are empty. Navigation cancellations remain in the four exact reports.

Actual latest offline captures: [Interior](offline-interior.png), [World](offline-world.png),
[Loot](offline-loot.png), [Missions](offline-missions.png), [Validation](offline-validation.png).
Retained actual [station editor](editor-station.jpg) and [game preview search](editor-game-preview.jpg).
Full strict 41 three-building/generated-landing screenshots and 5,000-instance
history evidence remain in the preceding 2.1.3 folder; final-head CI reruns every
editor suite, all four upgrades and the retained game checks before artifact upload.

## Campaign CI follow-up

[CI42297927816](https://github.com/thundercato/bunker-game/actions/runs/42297927816)
passed normal build/editor/moved-preview checks but timed out aiming at the middle
crane landing. The game reports a worker endpoint before its climb animation
releases input; the previous Y-only wait plus fixed 3.1 s delay could aim too early,
so input deliberately ignored it. The helper now waits for rendered/worker XYZ and
unpaused input within the original 30 s bound. All six actual KeyE/menu routes,
animation and mid-animation pagehide-save assertions remain; no teleport or game
change is introduced.

The original ray filename included `:down`, which GitHub artifact upload rejects.
Probe filenames are now portable, original IDs remain in JSON and full probe data
prints to CI logs. The [original failed-stage log](logs/ci-42297927816-failure.log)
records both errors. The original local crane-only run passed, matching an
intermittent scheduling issue; the corrected tests observe actual completion.

Corrected local follow-up: **focused crane 15/15 and full campaign 25/25 passed**. Each
records all six real Use routes with matching rendered/worker XYZ and input
unpaused. Full campaign retains combat, furnished stairs/return, journal/controller,
mission archive/rewards, old saves, licences and offline restart. Exception/missing
arrays are empty. [Full report](campaign-browser.json), [raw logs](logs/),
[actual upper platform](crane-platform.jpg) and [recorded pose](crane-platform-pose.json).
The post-browser 598-file exact-byte/no-extra check still passes. No public source
changed after `e3719db`; final-head normal CI is linked from PR82.

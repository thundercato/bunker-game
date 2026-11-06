# Native Apple cloud execution — 6 November 2026

Branch: `codex/apple-native-prototype`; review: [PR #87](https://github.com/thundercato/bunker-game/pull/87).
Content baseline: `25cd697be9d68a88fe8b66b5cfbcee268c565d6d`.
Verified native source: `9df6a2761e41182dfad9a90d330f13ae3eae7cd6`.

## Delivered source

A native SwiftUI/SceneKit first-person iPadOS/tvOS prototype reuses the actual
Forester’s cottage campaign layout through the existing world-document compiler.
It includes an outdoor approach, licensed furniture/vegetation, stable door/search
bindings, collision and stair surfaces, a camera torch, two-step search/collection,
three-item inventory, touch/gamepad input, TV focus and native-only checkpoints.
The world, editor, browser saves and Pages workflow are unchanged.

The deterministic Node exporter pins input hashes and records licence provenance;
25 unique meshes and 15,952 unique triangles occupy about 2.3 MB of source-derived
content. A Python-standard-library generator emits the checked-in Xcode project,
plists and separate shared-source schemes. No certificate, developer account,
MacBook, signing or distribution service was used.

## Verification

[Run 42310250562](https://github.com/thundercato/bunker-game/actions/runs/42310250562)
is **green on both macOS jobs**. Xcode 26.6 (17F113), macOS 26.6.2 (25G83),
iOS/tvOS SDKs and runtimes 26.5; signing disabled throughout.

| Target | Compilation | Simulator tests | Direct launch/capture |
| --- | --- | --- | --- |
| FieldSignaliPad — iPad mini (A17 Pro) | Build + test build passed | 10 Core + 3 renderer + 1 UI passed | Passed |
| FieldSignalTV — Apple TV 4K 3rd generation, 1080p | Build + test build passed | 10 Core + 3 renderer + 1 UI passed | Passed |

Independent macOS SwiftPM: 10 passed. iPad UI exercises actual touch-pad movement,
door opening, torch/inventory and Home/background/foreground/resume. TV UI checks
native focus and Menu/Back without sending the app Home. Model tests walk the
actual furnished cottage through both doors, search/collect once, climb to the
upper landing, save/reload and descend. Renderer tests load source triangles and
textures, check door surfaces/hinge and retain the table after collecting its coil.

Actual [simulator images and provenance](verification/README.md) are committed.
Full logs, `.xcresult`, screenshots and unsigned simulator `.app` ZIPs are retained
in Actions artifacts for 14 days (IDs 13548183883 iPad, 13547943804 TV). The cloud
proxy denied direct Azure artifact redirects; completed GitHub log archives and
log-embedded image previews supplied inspectable evidence. No Metal/shader errors
were reported. Nonfatal simulator/XCTest diagnostics are retained in the logs.

Earlier compiler, CFBundle layout, focus, accessibility and presentation failures
and fixes are preserved in [PROGRESS.md](PROGRESS.md), including one cancelled
partial iPad UI attempt. A simulator success does not establish physical-device,
real gamepad or sustained performance behaviour. SceneKit remains deprecated,
as documented in the framework decision; no full-port recommendation is implied.

Portable checks passed: nine conversion checks, byte reproducibility and project
generation checks. Existing read-only web checks passed: 165 Python tests with five
skips, 57 world-document tests, 54 layout tests, world-preview checks and the
561-file static build. Linux did not run Xcode or claim physical Apple testing.

## Separate existing web failure

[Web run 42308083323](https://github.com/thundercato/bunker-game/actions/runs/42308083323)
failed the campaign browser suite's final no-errors assertion with
`this.crackle is not a function`. Inspection and a read-only Node reproducer show
`site/audio-v9.js:3` shadows the inherited `audio-v7.js:20` method with an instance
property; the fault transition at `audio-v7.js:25` then calls that property. These
files and the browser test have identical Git blobs to baseline `25cd697`.
`git diff --quiet 25cd697 -- site tests .github/workflows/deploy-pages.yml` passes.
This is an existing browser workstream defect, recorded without altering the
canonical game, editor or concurrent branches. The PR is not described as having
all checks green.

## Reproduce and continue

[BUILD_AND_TEST.md](BUILD_AND_TEST.md) has exact commands and artifact details.
[MAC_HANDOFF.md](MAC_HANDOFF.md) contains the same-branch Codex Local prompt and
unsigned simulator commands. On the Mac, reproduce the existing schemes first;
then test physical touch/controllers, focus, loading, memory and sustained frame
times before recommending a larger port. SceneKit deprecation and the deliberately
bounded terrain/loot/audio/mission scope are documented in the subproject.

No merge, Pages publication, physical-device signing or TestFlight upload occurred.

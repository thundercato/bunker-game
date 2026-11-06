# Native Apple experiment — execution record

## Baseline and isolation

Started 6 November 2026 on `codex/apple-native-prototype`, from main
`25cd697be9d68a88fe8b66b5cfbcee268c565d6d`. Reviewed root and native AGENTS,
NATIVE_CLOUD_TO_MAC, CLOUD_FIRST_README, CODEX_HANDOFF, WORLD_DOCUMENT,
DESIGN_DECISIONS, NEXT_STEPS, ARCHITECTURE_REVIEW and CODEX_CLOUD_SETUP.
Reviewed concurrent PR #82 (editor; no changes adopted) and #86 (native guidance).
The source web runtime, editor, saves, schemas, assets and Pages workflow remain
read-only. No merge, publication, signing or TestFlight is authorised.

## Implementation checkpoint

The bounded scene is the existing two-storey Forester’s cottage, compiled from
the reviewed world-document/layout compiler. Swift simulation and native Apple
rendering consume one exported world-pose scene; stable IDs link doors, collision
and searches. Licensed source meshes are converted deterministically, with hashes
and provenance, rather than downloading replacement art. The prototype has its
own native-only persistence namespace.

Work in progress: source, portable conversion tests, reproducible Xcode project,
unsigned iPad/tvOS simulator CI, and Mac continuation instructions. No successful
Apple compilation or device test is claimed by this initial checkpoint.

## Recoverable source checkpoints

- `2d1ce05`: baseline/isolation record.
- `b606d7b`: first native scene, Swift Core, SwiftUI/SceneKit renderer and macOS CI.
- `08e5867`: deterministic conversion tests, real imported-scene route test,
  explicit native checkpoint UI, TV input ownership and texture rendering.

PR: https://github.com/thundercato/bunker-game/pull/87 (no merge or release).
The export contains 25 unique asset meshes / 15,952 unique triangles and
2,336,597 resource bytes, 97 objects, 90 colliders and seven interactions
(two doors, four containers, one loose surface). The actual scene uses the
campaign interior factory, not a separately rebuilt cottage layout. Source GLBs
retain registry hashes; original-composite search recipes are explicitly identified
in provenance. Only diffuse maps and vertex colours are imported.

Portable verification on the Linux cloud worker:

- `node native/apple/Tools/test_pipeline.mjs`: 8 checks passed.
- `node native/apple/Tools/convert_scene.mjs --check`: reproducible resources.
- `python3 native/apple/Tools/generate_project.py --check`: reproducible project.
- Python compile and bash syntax checks for native tooling passed.
- Existing browser domain suite: 165 tests ran, OK with 5 existing skips.
- Existing world-document suite: 57 passed; layout suite: 54 passed;
  world-preview pure suite passed; `python3 tools/build.py`: 561 files built.

These tests do not establish physical-device performance or native Apple
compilation. This Linux worker has no Swift/Xcode installation; actual Apple
results are supplied by Actions below. The web verification was read-only and did
not alter source runtime, campaign/editor saves or the Pages workflow.

Early CI checkpoint: push run 42303666577 was superseded by the PR event;
PR run 42303709125 reached Xcode 26.6 and successful resource conversion, but its
iPad pipeline step referred to `test_pipeline.mjs` before that file was committed.
The file is included in 08e5867. Superseded runs are not green build evidence.

[Run 42303844459](https://github.com/thundercato/bunker-game/actions/runs/42303844459)
compiled both targets with Xcode 26.6 / iOS and tvOS 26.5 SDKs and exposed the same
real source error: the `SCNView` options dictionary imported keys as String,
so `.preferredRenderingAPI` failed to resolve (with two cascading type-inference
errors). The fix uses `SCNView(frame: .zero)`, whose supported native backend is
Metal, rather than an incorrectly inferred options key. Neither job passed at
this checkpoint. Logs became accessible through `gh run view --log-failed` after
the run completed; direct Azure artifact redirects initially returned 403.

- `82c9bc4`: fixed the real SceneKit initializer error, added three Apple renderer
  boundary tests and completed playable controls/Mac continuation documentation.
- [Run 42304229866](https://github.com/thundercato/bunker-game/actions/runs/42304229866):
  **both generic simulator builds succeeded**, with Xcode 26.6 and iOS/tvOS 26.5
  SDKs. Both XCTest installations then failed with `IXErrorDomain 13`, “Missing
  bundle ID”. This is a generated app metadata defect, not missing Apple SDK
  support. No test or simulator launch passed in this run. The generator is being
  corrected to emit complete bundle metadata, with pre-install validation.

The official run-log archive endpoint (`gh api repos/thundercato/bunker-game/actions/runs/42304229866/logs`)
provided the completed build/test logs even while `gh run view --log` was waiting
for the overall run status. Direct artifact blob downloads still returned 403;
logs and result links remain recorded instead of assuming a pass.

- `cf2a24a`: explicit complete app/test plists, built-bundle validation, independent
  macOS SwiftPM checks and pause/inventory lifecycle regression.
- [Run 42305029792](https://github.com/thundercato/bunker-game/actions/runs/42305029792):
  9 of 10 Core tests passed; the imported-route test had six cascading assertions
  after an extra interaction correctly closed the inner door following collection.
  The route test now checks the exhausted container and resumes walking, retaining
  collision protection. TV compilation and initial bundle validation passed, but
  XCTest installation still reported missing bundle ID. Next diagnostics separate
  `build-for-testing` / `test-without-building`, validate every prepared app/test
  plist and attempt direct CoreSimulator installation. No simulator test pass or
  launch is claimed by this run.

- `0d96cd0`: corrected route interaction and isolated build/test/install phases.
  Run 42305682175 passed all **10 macOS Swift Core tests**. TV direct installation
  failed despite correct root plist fields. A read-only packaging audit identified
  the literal root `Resources` directory as CoreFoundation's legacy-bundle marker:
  Apple bundle lookup searched for `Resources/Info.plist` instead of the root file.
  Content is now packaged as `NativeContent` and every loader/export/check updated;
  original generated data bytes are unchanged. CI now rejects reserved root bundle
  layout directories and verifies `Bundle(path:).bundleIdentifier` through actual
  Apple Foundation. Boot waits are bounded with simulator diagnostics on timeout.
  Completed logs confirm iPad direct installation also rejected the same
  legacy bundle layout; neither platform reached a simulator test/launch pass.

- `3b6fa25`: renamed bundled data to NativeContent and added real Foundation
  identification plus reserved-layout guards. In run 42306411049 both platforms
  installed successfully and executed native tests: 10/10 Core cases and 2/3
  renderer cases passed. The door assertion incorrectly treated SceneKit's
  pivot-adjusted node centre as the source bottom; it now tests actual converted
  geometry bottom/top/corner world positions. TV UI launched the scene, but the
  pause/Back check failed. Exploration lacked a focus context, allowing Menu to
  go Home and lifecycle pause to masquerade as opening the in-app pause menu.
  The viewport now has explicit non-button focus; overlays focus their native
  controls and the smoke test checks that Menu leaves the app in foreground.

Run 42306411049 was cancelled after roughly ten minutes overall while iPad UI
was still progressing through real door, torch and inventory touch actions. Its
partial UI result is **inconclusive**, not a pass or proof of a hang. The next run
will be allowed to complete its UI flow. CI now attempts a direct scene screenshot
even after an XCTest failure, while preserving that original nonzero exit status.

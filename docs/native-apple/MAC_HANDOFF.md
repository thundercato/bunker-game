# Continue this prototype on Adam’s MacBook

Continue the existing branch and PR; the cloud implementation is recoverable from
GitHub without this workspace. This is an independent experiment, not a replacement
for the browser game or editor. Read [PROGRESS.md](PROGRESS.md) for exact compilation
and test results and [BUILD_AND_TEST.md](BUILD_AND_TEST.md) for build details.

## Cloud result to continue

Verified source `9df6a2761e41182dfad9a90d330f13ae3eae7cd6`,
[run 42310250562](https://github.com/thundercato/bunker-game/actions/runs/42310250562):
both schemes compiled and each simulator passed 13 unit/rendering tests plus one
UI case, then separately installed/launched/captured. Independent SwiftPM: 10
passed. Xcode 26.6, macOS 26.6.2, OS/SDK 26.5; iPad mini (A17 Pro) and Apple TV 4K
3rd generation simulators. Logs/xcresult/unsigned app artifacts live on that run
for 14 days; source and [small actual image evidence](verification/README.md) remain
in Git. No physical iPad/TV or real controller was tested. Later documentation-only
commits retain identical executable source to this verified checkpoint.

## Get the same work

Use Codex **Local** in the repository or a separate worktree on the Mac, with Xcode
26 or newer installed, plus Node.js 22+ and Python 3.12+ for the conversion and
project checks. The branch is `codex/apple-native-prototype`; review is
[PR #87](https://github.com/thundercato/bunker-game/pull/87). Do not check out or
replace the concurrent editor branch. In a fresh clone:

```sh
git clone https://github.com/thundercato/bunker-game.git
cd bunker-game
git fetch origin codex/apple-native-prototype
git switch --track origin/codex/apple-native-prototype
xcodebuild -version
xcodebuild -showsdks
xcrun simctl list devices available
node native/apple/Tools/convert_scene.mjs --check
node native/apple/Tools/test_pipeline.mjs
python3 native/apple/Tools/generate_project.py --check
bash native/apple/Tools/ci_build.sh ipad
bash native/apple/Tools/ci_build.sh tv
open native/apple/FieldSignal.xcodeproj
```

For an existing dirty checkout, preserve it and create a separate worktree rather
than running a forced switch/reset. If necessary, select the installed Xcode in
Xcode Settings / Locations (or set `DEVELOPER_DIR` for these commands). Install
iOS/iPadOS 26+ and tvOS 26+ simulator runtimes in Xcode Settings / Components if
missing. The scripts report a missing runtime explicitly; no provisioning profile
is needed. Select **FieldSignaliPad** or **FieldSignalTV**, choose a simulator and
Run. `cd native/apple && swift test` separately runs the portable model tests.

## Continue, rather than restart

The project generator is `native/apple/Tools/generate_project.py`, using Python’s
standard library and stable IDs. Add files under Sources/Tests/UITests and regenerate.
The existing world/compiler inputs and asset notices are pinned in
`native/apple/Tools/source-lock.json`; conversion details and the exported contract
are in `native/apple/Tools/README.md`. Do not casually refresh hashes to silence a
source mismatch: review changed canonical content and deliberately rebase the
native export. All resource poses are already in world space.

Swift Core is renderer independent. SwiftUI owns menus; SceneKit owns the genuine
native 3D view and camera spotlight. GameController provides extended gamepad input.
SceneKit remains available but is deprecated in Apple 26 SDKs; see
`native/apple/FRAMEWORK_DECISION.md` before evaluating a RealityKit follow-up. A
renderer replacement must preserve the existing geometry/interaction tests.

The native-only save domain is `org.fieldsignal.native.prototype.v1`, with key
`native-scene-checkpoint-v1`. Pause / Save native checkpoint is explicit. UI tests
use `--uitesting` to avoid real checkpoints. No web campaign or editor storage is
read, migrated or cleared.

## First local acceptance work

Inspect the actual simulator output and walk the cottage with touch simulation
and a connected controller: entrance and inner doors, furniture clearance, upstairs
landing, descent, search/collect once, table coil disappearance, torch, inventory,
pause/resume, controller reconnect and checkpoint relaunch. Check TV focus and
Back/Menu, including returning from menus without an accidental action. Keep
simulator control tests separate from real hardware evidence.

The imported garden is a bounded flat approach, not the campaign terrain. Loot is
a deterministic three-item fixture, not the browser survival/mission/loot engine.
Only diffuse maps and vertex colours are imported; full PBR maps, animated furniture,
audio, combat, missions, terrain and a complete port are future work. Door leaves
animate but open-door collision is a simplified passable doorway. Outdoor tree/log
dressing is cosmetic; the exported building colliders and garden boundary provide
movement collision. No sustained
frame-rate, thermal, memory or battery claim is established by a simulator.

After simulator review, physical iPad and Apple TV checks should measure controller
recognition, TV readability/focus, touch look sensitivity, loading, asset/material
appearance, frame times, memory and sustained thermals. Compare the same scene
against the browser game before recommending a full port. Device signing,
provisioning and distribution require Adam’s separate approval and secure Apple
developer setup. Never commit signing assets. Do not merge, publish or upload to
TestFlight without approval.

## Prompt for Codex Local

> Continue PR #87 on `codex/apple-native-prototype` in this Mac checkout or an
> isolated worktree. Read root/native AGENTS, docs/native-apple/PROGRESS.md,
> BUILD_AND_TEST.md, MAC_HANDOFF.md and native/apple/README.md. Preserve the web
> game, editor and concurrent branches. Reproduce the unsigned simulator builds
> and tests with installed Xcode 26+, inspect screenshots, then test the actual
> playable route and controller/menu behaviour. Fix real issues in this branch,
> regenerate the project/assets when needed and checkpoint changes. Distinguish
> simulator evidence from physical-device results. Do not sign, merge, publish
> or upload to TestFlight without my approval.

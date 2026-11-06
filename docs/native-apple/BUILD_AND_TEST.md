# Native Apple build and test procedure

Source preparation, simulator compilation, simulator interaction and physical
device testing are separate evidence gates. Check [PROGRESS.md](PROGRESS.md) for
the completed GitHub run IDs and results for this branch. The Linux cloud worker
cannot run Xcode; the native workflow uses hosted macOS runners.

## Portable checks in Codex Cloud

From the repository root, with Node 22 and Python 3.12:

```sh
node native/apple/Tools/convert_scene.mjs --check
node native/apple/Tools/test_pipeline.mjs
python3 native/apple/Tools/generate_project.py --check
```

To regenerate source-derived assets and the Xcode project deliberately:

```sh
node native/apple/Tools/convert_scene.mjs
python3 native/apple/Tools/generate_project.py
```

Review and commit generated changes. Conversion verifies the pinned source hashes,
stable IDs, transforms and licences. The project generator uses only Python's
standard library, sorted inputs and deterministic IDs; no package manager or
interactive Xcode setup is involved. Add Swift files below `Sources`, `Tests` or
`UITests`, then regenerate. Both targets use the same source and resource inputs.

On a host with Swift 5.9 or newer, run the renderer-independent model tests:

```sh
cd native/apple
swift test
```

This checks simulation, not Apple framework compilation. The package has no
external dependencies and reads the committed fixture from the source tree. The
Xcode unit test bundles copy that same fixture into their resources.

## Actual Apple builds and simulator tests

Use Xcode 26 or newer with the iOS 26+ and tvOS 26+ simulator SDKs and installed
runtimes. From the repository root on macOS:

```sh
xcodebuild -version
xcodebuild -showsdks
xcrun simctl list runtimes
xcrun simctl list devices available
python3 native/apple/Tools/generate_project.py --check
bash native/apple/Tools/ci_build.sh ipad
bash native/apple/Tools/ci_build.sh tv
```

`ci_build.sh` first builds the named scheme against the generic iOS Simulator or
tvOS Simulator destination, with `CODE_SIGNING_ALLOWED=NO`. It then selects an
available iPad or Apple TV UDID running OS 26 or newer, runs the XCTest model and
UI suites with `xcodebuild test`, and separately installs and launches the native
app with `simctl`. Missing compatible runtimes fail explicitly. The UI suite waits
for the native scene and attaches a screenshot. iPad UI checks also open the
inventory, toggle the torch, and pause/resume. The Apple TV UI check establishes
launch and uses the simulated remote Menu command to pause/resume. It does not
establish real controller input.

For example, the equivalent explicit iPad build is:

```sh
xcodebuild -project native/apple/FieldSignal.xcodeproj \
  -scheme FieldSignaliPad -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath native/apple/BuildResults/ipad/DerivedData \
  CODE_SIGNING_ALLOWED=NO build
```

For an explicit test destination, obtain an available UDID from
`python3 native/apple/Tools/select_simulator.py ipad` and supply
`-destination 'platform=iOS Simulator,id=THE_UDID'`. The TV scheme is
`FieldSignalTV`; its platforms are `tvOS Simulator` and `appletvsimulator`.

To open the generated project in Xcode:

```sh
open native/apple/FieldSignal.xcodeproj
```

Choose **FieldSignaliPad** or **FieldSignalTV**, select a simulator, then Run.
There is no development team configured and no certificate/provisioning profile
is needed for this phase.

## GitHub Actions evidence

[apple-native-prototype.yml](../../.github/workflows/apple-native-prototype.yml)
runs on `macos-latest` for native branch pushes, native-source PR changes and
manual dispatch. It selects the highest installed Xcode >=26 and records the
actual macOS version, developer directory, Xcode version, SDKs, simulator runtimes
and devices. iPad and TV jobs run independently; one target failure does not hide
the other. Push and PR events share a branch concurrency group to avoid duplicate
long-running matrix jobs.

Each platform's artifact retains:

- `sdk-and-simulators.log`, `build.log`, `tests.log` and `launch.log`.
- `Tests.xcresult`, containing test outcomes and UI screenshot attachments.
- `simulator-udid.txt` and `launched.png` from the separate install/launch.
- A ZIP of the unsigned **simulator** `.app` bundle.

Local script output is under `native/apple/BuildResults/{ipad,tv}` and is ignored
by Git. Actions artifacts are retained for 14 days. Download them promptly if a
longer-lived external evidence copy is needed. Inspect a result bundle on a Mac
with `open path/to/Tests.xcresult`.

An unsigned simulator app is neither an IPA nor an installable physical iPad or
Apple TV build. Physical controller behaviour, sustained performance, thermals,
remote focus, audio and device compatibility remain Mac/device work. No signing,
TestFlight upload, Pages deployment or distribution is performed by these scripts.

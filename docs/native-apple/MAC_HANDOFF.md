# Later local MacBook/Codex handover

This file is a template to be completed by the cloud-native task. The presence of this document is NOT evidence that any native application has compiled.

## Before you start on the Mac
- Clone or update https://github.com/thundercato/bunker-game, fetch the native Apple experiment PR, and verify its exact branch/commit.
- Install compatible Xcode and the required iPadOS/tvOS simulator runtimes in Xcode Settings if needed.
- Launch Codex in Local or Worktree mode, not Cloud, so it can use this Mac's files/Xcode. Do not restart from a blank project or touch unrelated game/editor branches.
- Follow native/apple/README.md and BUILD_AND_TEST.md; first compile unsigned simulator builds and run tests in Xcode.
- Then, if devices are available, use proper signing/provisioning in Xcode to test on physical iPad/Apple TV. Real hardware measurements and controllers are required before claiming native performance improvements.
- Code signing, Apple account, TestFlight and App Store Connect are separate actions requiring Adam's explicit permission. Never commit signing assets or passwords.

## Local Codex prompt
Continue the Field Signal native Apple experiment from the PR branch in thundercato/bunker-game, on this physical Mac using Codex Local or a separate Worktree. Read docs/native-apple/CLOUD_FIRST_README.md, native/apple/README.md, BUILD_AND_TEST.md and the current PR/CI logs. Check Xcode/SDK versions. Build both existing simulator schemes, run tests, fix actual Mac/RealityKit issues without touching the web release. Request consent before real-device signing, installing or TestFlight; report actual device results and preserve all changes in GitHub.

## Cloud agent: fill this section before handoff
- Branch / commit / PR:
- iPad scheme / actual build result:
- tvOS scheme / actual build result:
- Xcode / macOS runner / installed SDKs:
- Simulator test/launch results:
- CI URL and saved artifacts:
- World revision and asset conversion manifest:
- Known source/render/input limitations:
- Exact first commands to run on Adam's Mac:

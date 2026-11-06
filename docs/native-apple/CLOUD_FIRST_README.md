# Field Signal: cloud-first native Apple prototype
Prepared 6 November 2026. This plan explicitly separates cloud coding and hosted Apple compilation from later work on Adam's MacBook.

## Objective
Build a genuine native, non-AR Field Signal proof of concept for iPadOS and Apple TV, using the existing browser game as read-only source material. This is a third, isolated workstream; the playable web game and desktop editor continue separately. Do not wrap the website in a WebView and call that a native rendering port.

## No physical MacBook is needed during Phase A
Codex Cloud writes and tests code in its managed workspace. Do not assume the Codex workspace includes Xcode or runs macOS. GitHub Actions can provide an actual hosted Mac running Xcode through an isolated native-only workflow. Use a compatible macOS-26 hosted runner, inspect available SDKs and simulator runtimes, compile both native iPadOS and tvOS targets, and run simulator tests when available. GitHub macOS Actions usage is quota/metered; keep runs scoped, reasonably timed and avoid optional paid large runners without approval.

A successful simulator build is a real Apple compilation, but an unsigned simulator app is NOT an installable iPad/Apple TV application, a signed IPA, a TestFlight release, or evidence of physical-device performance. Do not claim otherwise.

## Cloud Phase A: actual deliverables
1. Inspect latest main and open PRs, branch independently under a name such as codex/native-apple-cloud, and keep all new native source inside native/apple/. Preserve web runtime, editor, assets and save files.
2. Confirm Apple RealityKit and SwiftUI APIs actually supported by selected iPadOS and tvOS minimums, initially targeting tvOS 26 on supported Apple TV 4K hardware. Verify current SDK/device compatibility from official Apple documentation, not assumptions.
3. Build a REAL first-person prototype: a recognisable outdoors approach to an existing Field Signal building, functioning door, valid floor/stair collision, some actual licensed furniture and vegetation, one searchable container, a collectable item, and a small native inventory screen. Aim for equivalent positions to source world/local building data.
4. iPad: touch movement/look and native controller support. Apple TV: gamepad-first controls, native menu focus/Back handling and television legibility. Handle controller loss and app pause.
5. Pin the imported world/source revision, stable entity IDs and asset conversion pipeline. Reuse a small, optimised, legally licensed source asset subset; record author, URL, licence and modifications. Do not commit large proprietary assets or signing credentials. Validate local/world coordinates, pivots, scene orientation, material and collisions.
6. Maintain an Xcode project directly or generate it reproducibly from a pinned project generator version. Clearly define two separate build targets/schemes and platform availability. Never rely on a one-off manual Xcode wizard.
7. Create a separate GitHub Actions workflow, for example .github/workflows/apple-native-prototype.yml, activated manually or by native-only PR path filters. Do not alter the existing GitHub Pages workflow or run expensive Apple CI on every unrelated web commit.
8. In the hosted macOS job report: xcodebuild -version, xcodebuild -showsdks, xcrun simctl list devices available, and the selected toolchain. Build iPadOS Simulator and tvOS Simulator with CODE_SIGNING_ALLOWED=NO using appropriate schemes and generic simulator destinations. Attempt native unit tests and simulator launch/interaction when runtime permits. Preserve logs and xcresult plus optional unsigned simulator app artifacts.
9. Inspect actual workflow results, fix compile/test errors and rerun only as needed. A Linux swiftc check alone does not pass the Apple build gate. If Github Actions is unavailable because of quota, permissions or infrastructure, record the exact failure and prepare a one-command Mac continuation, not a fictitious green CI.
10. Leave small meaningful commits, a reviewable PR, and native/apple/README.md, docs/native-apple/PROGRESS.md, docs/native-apple/BUILD_AND_TEST.md and a completed MAC_HANDOFF.md. No unsigned artifact is represented as installable.

## Phase B: later, with MacBook and Codex Local
On MacBook, clone/pull the same PR branch; start Codex in Local or Worktree mode with Xcode available. Run the project's documented builds and simulators, then verify real iPad/Apple TV hardware, controller behaviour, sustained performance, lighting, sound and assets. Device signing/provisioning, TestFlight and App Store Connect require separate explicit approval and secure developer credentials. No TestFlight upload or signed public release in Phase A.

The Mac agent must be able to continue from GitHub commits/CI artifacts without the original Codex Cloud VM. The native experiment MUST NOT read or change normal web campaign keys, automatically migrate saves, or affect the web editor.

## Review gates and truth labels
Report separately: source written; validated/imported assets; iPad Simulator compiled; tvOS Simulator compiled; simulator launched; actual controller input tested; actual devices tested; signed/distributed. Keep unfinished stages unmarked. Cloud simulator or software rendering is not a physical device thermal/frame-rate benchmark.

## Primary references
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md
- https://developer.apple.com/videos/play/wwdc2025/287/
- https://developer.apple.com/documentation/xcode/building-and-running-an-app
- https://learn.chatgpt.com/docs/environments/cloud-environments

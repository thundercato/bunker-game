# Field Signal native Apple prototype: cloud first, Mac later

Prepared 6 November 2026. This is a **third independent Codex workstream**, not an iPad/tvOS port that already exists and not permission to merge or publish a new game. Its brief is [CODEX_PROMPT.md](CODEX_PROMPT.md).

## Objective

Build a small genuine **native** first-person Field Signal prototype, **iPad first**, with a compatible **Apple TV 4K / tvOS 26+** target where officially supported. Reuse an immutable, versioned, validated subset of the existing game's content. Preserve the current Three.js/Pyodide browser game and the other two ongoing Codex tasks. Do not claim a WebView is native 3D.

## Where the development actually runs

**Codex Cloud** can author Swift/RealityKit source, an Xcode project, scene content, tests and data tools while the owner's Mac is powered off. Its task environment need not be macOS.

**GitHub Actions** provides separate GitHub-hosted macOS machines, including Apple-silicon runners, where Xcode and iOS/tvOS simulator SDKs can be used. They are not the Codex task VM. Configure a **new, independent, narrowly scoped workflow** for the native directory; do not alter the existing GitHub Pages web-release workflow or touch game/editor source. macOS runners and simulators have availability and resource limitations. Check actual Xcode versions, installed simulator runtimes, and run logs rather than assuming a target can build.

**Physical Apple devices** are still needed to verify real graphics/performance, touch, Game Controller mapping and haptics. Unsigned simulator builds can be validated in CI without an Apple signing account. Running on physical devices, exporting installable signed apps and TestFlight distribution require signing/provisioning and later approval. Do not put Apple credentials or provisioning profiles in the repository or Codex prompt.

GitHub public-repository standard hosted runner minutes are currently free per GitHub documentation, but runner resources/concurrency and policies still apply; do not spin indefinitely or use unnecessary macOS minutes. Always validate current GitHub billing and runner availability.

## Official sources (review before implementation)

- GitHub-hosted macOS runners: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- GitHub Actions runner billing: https://docs.github.com/en/actions/concepts/billing-and-usage
- Apple Xcode CLI: https://developer.apple.com/documentation/xcode/xcode-command-line-tool-reference
- Apple simulator and physical device differences: https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices
- RealityKit tvOS 26: https://developer.apple.com/videos/play/wwdc2025/287/
- Codex Cloud environments: https://learn.chatgpt.com/docs/environments/cloud-environments

RealityKit tvOS support was announced for **Apple TV 4K on tvOS 26**. Do not assume older Apple TV HD supports it. The prototype is non-AR, with an independently controlled in-game camera, not a camera feed or room-tracking experience. Verify each needed camera, physics, material, audio and controller API on both targets.

## Ownership and file layout

- New files live under native/apple/ (example: application/project files, Shared/, Assets/, Tools/, Tests/), docs/native-apple/, and optionally one native-only .github/workflows/ workflow.
- Do not change canonical web content, Python gameplay, world compiler/schema, asset manifests or the editor. If an integration contract is missing, create docs/native-apple/INTEGRATION_REQUESTS.md and continue independent work.
- Pin a specific **Git SHA and content manifest** for source snapshot conversion. New Codex tasks must not assume other tasks' uncommitted edits or blindly pull from a moving branch.
- Use stable building/object IDs and known coordinates, validating transforms and local child coordinates exactly once. Current world-document source formats are the source of truth. Create a portable output snapshot, not a second permanent canonical schema.
- Respect licensed model/textures/sounds and attribution; include only approved optimised assets and exclude font binaries.
- This workstream owns its native prototype and independent workflow only; the other tasks own game releases, current web runtime and editor.

## Cloud development phases

**N0 Audit:** Read AGENTS.md, docs/CODEX_HANDOFF.md, docs/WORLD_DOCUMENT.md, docs/NATIVE_EVALUATION.md and the current code. Inspect active PRs, conflicts and head revision. Verify the CI macOS runner SDK and supported RealityKit APIs. Benchmark current web representative content when possible, without claiming real device FPS.

**N1 Portable content slice:** Export/validate one small recognizable Field Signal scene (furnished building, a door, one staircase if applicable, searchable cupboard, nearby wooded exterior). Create a deterministic data pipeline that preserves parent/child transforms and source attribution; test it without Apple-only frameworks. Make conversion tools reproducible. If GLB needs USDZ or USD conversion, perform the Apple-specific conversion in the macOS workflow or document an exact deterministic process. Flag unsupported model materials instead of silently replacing them.

**N2 Apple source and build:** Create a checked-in buildable Xcode project with shared native logic and separate iPadOS/tvOS entry points. Implement a first-person non-AR renderer prototype with representative native materials, door interaction, collision, searching and an isolated test inventory. Add iPad touch controls and controller-first Apple TV controls; handle pause, focus and controller disconnect. Use a limited test game-state schema, never silently import or overwrite a real web save.

**N3 Cloud macOS CI:** A new workflow triggered by PR changes to native/apple/** and workflow_dispatch only. Select macOS runner and inspect xcodebuild -version, xcodebuild -showsdks, xcodebuild -list -project (or workspace); then run **unsigned** simulator-target builds. Example commands after determining the actual schemes:

  xcodebuild -project native/apple/FieldSignalNative.xcodeproj -scheme FieldSignalPad -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
  xcodebuild -project native/apple/FieldSignalNative.xcodeproj -scheme FieldSignalTV -configuration Debug -sdk appletvsimulator -destination 'generic/platform=tvOS Simulator' CODE_SIGNING_ALLOWED=NO build

Actual targets/scheme names and available SDKs are to be discovered, not guessed as working. Add automated tests with named simulator destinations if available, but do not claim the simulator faithfully measures device GPU performance. Upload build logs and unsigned simulator artifacts only when useful, with retention and size limits. Never upload credentials, personal data, or a public signed IPA.

**N4 Mac handoff:** When the user later opens the repo on their Mac with Codex Desktop/CLI, they can pull the reviewed branch, run Xcode, select their signing team, run on physical iPad and Apple TV 4K, diagnose controls and real frame times, and, if separately approved, prepare TestFlight. Keep a precise checklist at docs/native-apple/MAC_HANDOFF.md updated with tested CI SHA, Xcode/SDK, asset-conversion commands, schemes, known issues and the next device tasks.

## Verification and reporting levels

Distinguish: source generated; platform-independent tests passed; Xcode project compiled on macOS CI; simulator launched / tests passed; **actual iPad or Apple TV tested**; signed distribution complete. Do not describe all of these as simply 'playable'.

The first delivery should be a reviewable PR with native sources and at least a verified cloud CI compile where runner availability permits. If macOS CI cannot run, deliver source and exact blocker with reproducible Mac instructions, not a false claim of compilation. Do not merge, replace or publish the working browser game.

## How to move to the Mac later

1. Open the same repository in Codex on macOS and read this file plus MAC_HANDOFF.md.
2. Pull the reviewed native branch/PR (or a merged snapshot if separately approved). No old chats or zip transfers are required.
3. Install the Xcode version documented by CI; inspect platform SDKs and available simulator targets.
4. Open the project in Xcode, first run the iPad simulator, then physical iPad and Apple TV tests using a configured signing team.
5. Report real device GPU/CPU frame times, app memory, heating, input, audio and camera behaviour; compare a matching web scene. Do not upload to TestFlight until requested.

If a GitHub CI build is successfully compiling both targets, the Mac phase is a **review/device-testing/signing task**, not 'start writing an app from scratch'.

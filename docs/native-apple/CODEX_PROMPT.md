# Third Codex task: Field Signal native Apple, cloud-first

Use the same repository: **thundercato/bunker-game**, in a NEW Codex Cloud task and a NEW feature branch (e.g. codex/native-apple-prototype). Do not restart the two existing game and editor tasks.

## Paste this into Codex Cloud

~~~text
Develop a genuine native Apple-platform Field Signal prototype in
thundercato/bunker-game. I am working entirely in Codex Cloud now.
I do NOT have my MacBook available and do not want to rely on it
for initial implementation, compilation or simulator verification.
Later, when the GitHub work is ready, I will use Codex on my Mac
to continue device testing, signing and distribution.

Start from current main in a separate feature branch, e.g.
codex/native-apple-prototype. Inspect active PRs and uncommitted
changes. Read AGENTS.md, docs/native-apple/CLOUD_FIRST.md,
docs/CODEX_HANDOFF.md, docs/WORLD_DOCUMENT.md,
docs/ARCHITECTURE_REVIEW.md and docs/NATIVE_EVALUATION.md.

Do not start by asking me to open Xcode or install a Mac toolchain.
Work independently in the cloud and commit recoverable progress.

CLOUD-FIRST BUILD STRATEGY

The Codex Cloud environment can author source and run portable tests.
Set up a separate GitHub Actions macOS workflow to do the actual
Xcode/iPadOS/tvOS compilation in the cloud. This does not depend
on my local MacBook.

Verify available GitHub-hosted macOS runners, installed Xcode/SDKs
and RealityKit API/target support from official documentation.
Select an appropriate macOS runner and build targets using
CODE_SIGNING_ALLOWED=NO and the available simulator SDKs.
Use path filters/workflow_dispatch and sane timeouts. Keep this
workflow separate from the existing browser-game Pages pipeline.
Do not require Apple credentials or secrets for unsigned simulator
builds, do not make signing a prerequisite for cloud development,
and do not silently change paid account settings.

APPLE PROTOTYPE

Prioritise a genuine non-AR first-person native RealityKit prototype
on iPadOS, and share as much code as possible with a tvOS target
for supported Apple TV 4K/tvOS 26+ devices. Verify platform-specific
API availability instead of assuming code works on both.

Use a version-pinned subset of the existing game world, models,
materials, textures, source licences and stable object IDs.
Build a deterministic asset-export/conversion pipeline, including
tests of transforms, pivots, scale and collision. Do not modify the
existing web assets or canonical schema, and do not use generic
primitive shapes as the sole representation of the game scene.

Implement a small recognisable slice:
- One furnished existing building and neighbouring outdoor area.
- Enter through an operable door.
- Walk through interior and, where viable, climb stairs.
- Search a cabinet and collect one existing catalogue item.
- View a minimal native inventory screen.
- Torch, representative environment lighting and local ambience.
- iPad landscape touch movement/look, plus connected controller.
- Apple TV controller-first movement, focus-aware menus, pause,
  disconnect and reconnect handling.

This is not a full game port. If one API or platform is blocked,
record the real compiler/SDK diagnostic and finish other testable
parts. Do not replace native rendering with an embedded WebView.

ENGINE AND DATA

Prefer Swift + RealityKit for this isolated Apple-only proof of
concept; confirm current official API support. If it genuinely
cannot provide the required non-AR camera, physics or 3D scene
on both platforms, document a narrow alternative and evidence,
not a speculative complete engine migration.

Do not migrate Python gameplay, mission systems or actual saved
campaigns. Keep a small isolated native test state and define
clear data boundaries for a possible future parity effort.

REPRODUCIBLE MACOS CI

Check in a reproducible Xcode project or a pinned generator
with reproducible project-generation instructions. Do not
deliver only loose Swift files.

Build both supported simulator SDK targets in GitHub Actions.
Run portable import/asset/transform validation on Linux first.
On macOS, record xcodebuild -version, installed SDKs, named targets
and actual build/test commands. Run available simulator tests
with deterministic results. Capture truthful logs and artifacts
and clearly distinguish compiled-only from simulator-run and
physical-device tested.

Do not presume the Codex task VM itself has Xcode; GitHub
Actions macOS CI performs the platform-specific compilation.
Keep the workflow path-scoped, with appropriate timeout,
artifact retention and safe permissions.

The entire project must remain in GitHub as tested source,
not just an inaccessible cloud VM. Make meaningful commits
and open a reviewable PR. Do not merge, publish, distribute,
sign or change the live web game without approval.

MAC HANDOFF

Create and maintain:
- native/apple/README.md
- docs/native-apple/PROGRESS.md
- docs/native-apple/BUILD_AND_TEST.md
- docs/native-apple/MAC_HANDOFF.md
- docs/native-apple/COMPATIBILITY.md

MAC_HANDOFF.md must give future Codex running on my Mac
the exact branch/commit, matching Xcode/SDK version,
project/schemes, simulator/device steps, asset conversion,
signing configuration when appropriate, real-device
performance checks and known issues.

Keep game/editor/preview/save source untouched except minimal,
clearly reviewed, necessary, compatible integration requests.
Coordinate only through documented contracts with the two
other Codex tasks. Never overwrite their branches.

Continue through useful implementation and tests, checkpoint
often, and report real progress rather than generic plans.
If cloud macOS CI cannot run, explain precisely why and leave
the reproducible native source; do not claim builds passed.

At the end, report:
1. Feature branch, commits and PR.
2. Exact native scene and interactions implemented.
3. Actual GitHub macOS Xcode build outcomes, iPad and tvOS.
4. Simulator tests and limitations.
5. Asset and licence validation.
6. The precise Mac handover steps and remaining device tests.
7. Whether this prototype justifies continuing native development.

Do not ask me to use my Mac yet. That is Phase 2.
~~~

## After the cloud task

When the new native PR is in a reviewable, buildable state, later launch Codex on the Mac with:

~~~text
Continue the Field Signal native Apple prototype from
thundercato/bunker-game. Read docs/native-apple/CLOUD_FIRST.md,
docs/native-apple/MAC_HANDOFF.md and the native PR's test results.
Use the exact validated branch and compatible Xcode/SDK. Do not
rewrite or revert the cloud implementation. Set up this Mac
for physical iPad and Apple TV 4K testing; first confirm
the cloud CI builds locally, then test rendering, inputs,
loading, audio, memory, heat and frame times on actual devices.
Keep signing credentials local/secure. Do not upload to
TestFlight until I explicitly approve it. Commit fixes and
update the same PR or its documented successor.
~~~

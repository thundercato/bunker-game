# Field Signal native Apple prototype: cloud-first Codex handover

Updated 6 November 2026. This is the brief for a **third, separate Codex Cloud task**, not a new game release. The web game and World Editor continue separately. Adam wants to develop in the cloud now; **MacBook/Xcode handoff later**, when he has access to it.

## Crucial distinction

Codex Cloud's task computer is not guaranteed to be a macOS machine with Xcode. **GitHub Actions offers hosted macOS runners** that can run Xcode builds without Adam switching on his own Mac. Codex should author/commit the native project and its tests, then use a *separate, optional* macOS CI workflow to verify unsigned **iPadOS/iOS Simulator and tvOS Simulator** builds if the repository's runner access and usage budget permit.

This is not remote streaming, not a substitute for physical iPad/Apple TV testing, and not an App Store/TestFlight release. Compiling Swift/UI code in a cloud macOS runner proves an Apple toolchain build, not real device compatibility, battery, haptics, sustained frame rate or signing. GitHub Actions usage may consume included minutes or incur charges; respect the account's current usage/budget, avoid an every-commit macOS matrix and make manual dispatch available.

Official references:
- GitHub macOS runners: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Apple RealityKit supports iOS/iPadOS and tvOS (newer OS/hardware requirements apply): https://developer.apple.com/documentation/realitykit
- RealityKit tvOS from 2025: https://developer.apple.com/videos/play/wwdc2025/287/
- Codex Cloud environments: https://help.openai.com/en/articles/20001545-using-codex-cloud

## Scope and ownership

- Repository: `thundercato/bunker-game`. Start from **current** `main`, not an old ZIP or stale pinned SHA.
- Existing game task owns browser/runtime and core content. Existing editor task owns authoring UI. Native task owns `native/apple/**`, `docs/native-apple/**`, and an isolated workflow `.github/workflows/native-apple.yml`. Do not rewrite `site/**`, its existing `tools/build.py`, normal Pages workflows, save keys, or shared world contracts.
- Prefer a thin read-only importer of approved `site/world.json`, the canonical `site/world-document.js` compiler or exported reviewed documents; if the exporter is missing, request a narrow contract rather than inventing another game source of truth. Pin source revision and record model/item IDs. Ensure stable local-vs-world transforms and explicit missing-ID failures.
- New project: **actual native first-person 3D** iPad application with a shared tvOS target, not WKWebView or a screen casting client. Evaluate Swift/SwiftUI and RealityKit for a conventional non-AR, player-camera world. Verify target APIs and deployment minimum against currently available Xcode SDKs; do not assume iPad-specific views/functions compile on tvOS. If blocking, document a bounded alternative instead of silently switching the whole project to Unity.
- Keep a shared Swift core only for portable content parsing, model/scene configuration and small interaction rules. Do not claim full parity with the Python survival simulation. No networked backend or paid inference API.

## Phase A: complete in cloud, without a personal Mac

1. Audit the current repository, actual content, model licences and two concurrent PRs. Create a clean feature branch `codex/native-apple-cloud` or another unique name. Note baseline commit in progress log.
2. Build a reproducible Xcode project for iPadOS and tvOS under `native/apple/` using a tracked `.xcodeproj` or tracked project-generation configuration and pinned tool version. Include README, a single scheme or documented schemes, and configuration that does not require signing for simulator builds.
3. Implement a small native scene: a recognisable Field Signal refuge/hut exterior, openable door, a coherent furnished interior, stairs if the scene allows, nearby forest props, torch/light and one searchable object with a collectible item. Use verified existing licensed assets and retain provenance; optimise/reuse meshes where possible.
4. iPad: landscape camera look and movement, touch interface, controller handling. Apple TV: controller-first movement, legible focusable menus, pause and Back/Menu handling, and a way to recover from controller disconnect. Make input abstraction testable without hardware.
5. Implement a representative local inventory view and tiny independent prototype state. Do not write to the browser campaign, migrate real saves, or assert real v11 mission parity. No signing secrets.
6. Add pure Swift/unit tests for schema validation, asset metadata, transforms, IDs, movement/collision helpers and interactions. Where native rendering cannot be tested, keep renderer-facing code isolated and clearly record the gap.
7. Add `.github/workflows/native-apple.yml` **scoped only to `native/apple/**`, `docs/native-apple/**` and its own workflow** for PR changes, plus `workflow_dispatch`. Use an available macOS runner; print `xcodebuild -version` and `xcrun simctl list devices available`; select installed SDKs and supported generic simulator destinations, not a non-existent simulator by name. Run unsigned iPadOS simulator and tvOS simulator builds (e.g. `CODE_SIGNING_ALLOWED=NO`) and applicable unit tests. Set reasonable timeouts and avoid uncontrolled repeated expensive runs. Upload logs and non-sensitive build/test artifacts when useful. Do not ship unsigned simulator output as an installable iPad app.
8. If GitHub Actions is available, fix genuine compile failures found in macOS CI until both target builds pass, or document an actual verified limitation. Codex Cloud itself need not have Xcode. A PR check in GitHub macOS is the cloud validation; do not claim the Codex Linux VM compiled Apple frameworks.
9. Capture real simulator screenshots only if the CI runner actually launches the app and rendering succeeds. A successful `xcodebuild build` is not a gameplay/screenshot/device test. Don't invent frame rates or performance gains.
10. Commit working milestones, push a reviewable PR and provide exact source commit, environment/build job links, tests, unsupported APIs/assets, and what Adam will need to do on his Mac. **Do not merge or deploy** unless separately instructed.

## Phase B: later MacBook handoff

When Adam is ready, launch Codex on his MacBook with the checked-out repository and this brief. Ask Codex to:
- Review/checkout the native prototype PR, install/use compatible Xcode/SDKs and run the documented project-generation step if any.
- Build the iPad and Apple TV schemes in Xcode; launch iPad simulator, tvOS simulator and, when authorised and connected, real iPad/iPhone/Apple TV hardware.
- Test controller hardware and optional haptics, performance, thermal/memory, focus behaviour, audio, models/lighting and the actual interact/search loop.
- Investigate failed builds against the exact CI SDK versions; reconcile with latest `main` and the game's shared data, avoiding accidental cherry-pick collisions.
- Configure personal/team signing **locally through approved Apple developer setup**, not by committing keys/passwords/certificates.
- Only after an explicit request, prepare TestFlight distribution (tvOS and iPad separately as required); do not treat simulator artifacts as signed releases.

## Objective proof and release definitions

The deliverable for Phase A is a **code-reviewed native prototype PR with reproducible macOS CI results** and exact Mac handoff instructions. Mark explicitly: code generated / compiled in macOS CI / launched in simulator / exercised interactions in simulator / tested on physical iPad or Apple TV / signed / distributed. Never collapse these statuses into 'native game is finished'.

The single acceptance loop is: player loads an existing Field Signal scene, moves to a door, opens it, enters, searches a cupboard, collects one item and walks out. Avoid spending the entire task perfecting polish before a real end-to-end loop. An Apple TV target that only compiles but cannot run is reported as a partial target.

## Ready-to-paste Codex Cloud prompt

```text
Continue Field Signal in thundercato/bunker-game as a THIRD, isolated native Apple prototype task, cloud-first. My MacBook is unavailable during this phase. Do not require a personal Mac, local Xcode or physical Apple hardware now.

Read AGENTS.md, docs/NATIVE_APP_CLOUD_FIRST.md, docs/CODEX_HANDOFF.md, docs/ARCHITECTURE_REVIEW.md, docs/DESIGN_DECISIONS_2026-11-06.md and inspect latest main and concurrent PRs. Use your own feature branch; keep native implementation under native/apple/, native documentation under docs/native-apple/, and an isolated native-apple GitHub Actions workflow. Do not modify browser game/editor files, shared production schemas, normal saves or Pages deployment.

BUILD, don't just propose: create a genuine Swift native iPadOS first-person 3D prototype with a shared tvOS target, preferably RealityKit where supported. This must not be a web wrapper. Reuse/pin validated Field Signal scene data and properly licensed existing models. Implement a recognisable house/refuge slice, controls, working door, walkable interior, one searchable cupboard, collectible item, inventory feedback and a small outdoor area. Use platform-appropriate touch/gamepad and TV menu focus. Keep test data isolated and no signed distribution.

Use Codex Cloud for authoring, parsing tests, docs and a PR. Add an optional separate macOS GitHub Actions CI job to build and test unsigned iPadOS and tvOS simulator targets using Xcode on GitHub-hosted macOS. If available and within approved runner usage, execute/fix builds there and report exact job links and target status. If unavailable, state that compilation is unverified and still provide a reproducible tracked Xcode project. Never claim Linux compiled RealityKit, and never invent simulator screenshots or hardware frame rates.

Do not ask me to switch on my Mac. Save every meaningful checkpoint in GitHub. Provide a working source project and thorough docs/native-apple/MAC_HANDOFF.md for a later Codex session on my Mac to build, test controllers/performance, configure signing, and optionally distribute after my explicit approval. Do not merge the PR, alter web releases, touch credentials or upload to TestFlight.

Use all productive available development time on implementation and verification, not filler. Finish with a PR, commit, exact macOS CI results, what compiles/actually runs, what is missing, and the next MacBook handoff command. Ask only blocking questions.
```

## Ready-to-paste MacBook Codex handoff (later)

```text
I'm now at my MacBook with Xcode available. Continue the native Field Signal Apple prototype from the existing GitHub PR and docs/NATIVE_APP_CLOUD_FIRST.md plus docs/native-apple/MAC_HANDOFF.md. Do not start over. Inspect source, CI results, Xcode/SDK versions and the latest main; preserve the web game and editor. Build iPadOS/tvOS schemes, test simulator and available physical devices, review real rendering, controller input, focus and performance. Fix any discrepancies, commit tested changes and document device results. Keep signing credentials in Apple's secure local tooling. Do not upload to TestFlight or publish without my explicit approval.
```

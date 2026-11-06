# Third Codex task: native Apple, entirely cloud first

Use this in a NEW Codex CLOUD task for the existing repository thundercato/bunker-game. Select latest main and work on a separate feature branch. Do not interrupt or replace the game or editor tasks.

COPY THIS PROMPT:

Build a genuine native iPadOS and tvOS Field Signal prototype entirely in Codex Cloud plus GitHub-hosted macOS Xcode CI. My MacBook is unavailable now, so the task must not require any local Mac, Apple ID sign-in or physical device.

Before coding read AGENTS.md, docs/CODEX_HANDOFF.md, docs/ARCHITECTURE_REVIEW.md, docs/WORLD_DOCUMENT.md, docs/DESIGN_DECISIONS_2026-11-06.md and docs/native-apple/CLOUD_FIRST_README.md. Inspect actual main, open PRs and shared schema revisions. Branch off latest main as codex/native-apple-cloud. Restrict files to native/apple/, docs/native-apple/ and a separate native-only GitHub Actions workflow. Preserve the web game/editor/saves/assets.

Phase A, implement now in the cloud:
- Create a reproducible Xcode project with distinct iPadOS and Apple TV targets, using SwiftUI + RealityKit where verified compatible, and genuine non-AR first-person rendering rather than a WebView wrapper.
- Import a pinned, small licensed sample of the EXISTING Field Signal world: outdoor path, enterable house, aligned door/stairs/collisions, furniture, a searchable cupboard, item pickup, a minimal inventory, lighting, a few trees, and source-compatible stable IDs. Do not duplicate the whole browser simulation or invent a competing world format.
- Provide landscape touch movement/look on iPad and native gamepad support on both; TV focus/back/pause behaviour must work. Separate prototype storage from real saves.
- Keep model import/conversion repeatable, small and licensed, recording asset source, changes, scale, orientation and test output.
- CRITICAL: do not stop because the Codex Linux cloud workspace lacks Xcode. Set up a native-only .github/workflows/apple-native-prototype.yml running on a compatible GitHub-hosted macOS runner. Check installed Xcode, SDKs and simulators, compile both iPad Simulator and tvOS Simulator app targets with CODE_SIGNING_ALLOWED=NO. Run unit and simulator-launch tests where supported. Report actual job URLs/logs and fix errors until successful or a genuine permissions/quota/toolchain restriction is documented. A syntax check alone is not acceptable.
- Use path-filtered PR or workflow_dispatch triggers, reasonable timeouts and normal included hosted runners. Do not select paid larger runners without approval. Upload test logs, xcresult and optionally unsigned simulator app artifacts. Do not put certificates, Apple IDs, API keys, provisioning profiles or font files in GitHub.
- Measure and compare relevant scene behaviour only where supported. Do not claim a hosted simulator represents physical iPad/Apple TV performance or that unsigned app artifacts can be installed on hardware.
- Make coherent commits and leave a reviewable PR. Do NOT silently merge to main, install to hardware, sign, upload to TestFlight, or modify the live game.

Phase B, prepare for my MacBook later:
- Write/update docs/native-apple/MAC_HANDOFF.md, including the exact source branch, commit, schemes, Xcode and SDK versions, CI run links, native assets, test evidence, exact local Xcode commands, known limitations and a ready local Codex continuation prompt.
- The MacBook Codex task will pull the GitHub branch and run Xcode locally for device signing and iPad/Apple TV verification only after explicit approval. Its job is to CONTINUE, not restart the port.
- Checkpoint to GitHub frequently. Do not rely on the cloud VM being retained.

Complete useful implementation, not just a plan. End with a precise status for iPad compile, tvOS compile, simulator launch, native tests, actual devices (not yet), signing (not yet), PR and remaining work. Ask only genuine blockers one at a time.

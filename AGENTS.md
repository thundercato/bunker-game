# Field Signal: repository instructions for coding agents

## Start here

Read these before changing code:
0. `docs/MEGA_BUILD_README.md` when working on the user-requested major game-first environment, asset and 3D journal overhaul. It is ambitious requested scope, not shipped functionality; checkpoint frequently.
1. `docs/CODEX_HANDOFF.md` for the verified implementation state and entry points.
2. `docs/DESIGN_DECISIONS_2026-11-06.md` for Adam's approved direction, superseded ideas and unresolved details.
3. `docs/NEXT_STEPS.md` for staged work and acceptance criteria.
4. `docs/ARCHITECTURE_REVIEW.md` before proposing an engine or language migration.
5. `docs/CODEX_CLOUD_SETUP.md` for the environment and exact existing test commands.

Do not assume this task has access to earlier chat history. The documents are the durable handover. If code and a historical release report disagree, inspect the code and record the discrepancy. An agreed feature is not automatically implemented.

### Current campaign priority: game first

For the mega-build campaign, Adam's latest request changes the earlier editor-first task order: prioritise the playable world overhaul, 3D journal, richer licensed assets, useful searchable interiors and gameplay polish. Retain the shared-world/compiler work needed to make those changes reliable, and keep new content compatible with the editor. Do not repeat M0 or recreate the M1 compiler already delivered in PR #80; inspect subsequent changes before continuing.

This is an extensive implementation task, not a plan-only request or a restriction to one tiny slice. Continue through ready milestones within the actual task's limits, with tests and recoverable checkpoints between them. Use substantial available effort for real implementation, asset optimisation and verification; do not waste allowance on filler or claim to control the user's quota/reset. If blocked on one independent workstream, document it and continue with another safe one. Preserve all release, licence and save-protection rules below. The compact kickoff prompt is in `docs/MEGA_BUILD_START_PROMPT.md`.

## Project and current boundary

This is Field Signal, not the retired Bunker Game whose repository name is retained. It is a gritty first-person survival game for mobile browsers, with a desktop-first authoring editor. The working game uses Three.js/JavaScript rendering and Python gameplay through Pyodide in a browser worker. It is hosted as static files on GitHub Pages.

The published game is Field Signal 11.1.0 (Field Journal & Quayside), retaining the Overgrowth v11 engine and schema-9 campaigns. See `docs/EXECUTION_2026-11-06_PUBLICATION.md` for the live link and verified release. The v1 building editor has an isolated actual-game preview. The v2 full-map editor at `site/editor/world.html` now has a bounded Survey hut actual-game preview using the versioned world compiler. Terrain, water, roads and other building drafts still DO NOT drive the normal playable world. See `docs/WORLD_DOCUMENT.md`; do not report full-map runtime integration as complete.

## Working and release rules

- Inspect `git status`, the current branch and relevant instructions first. Preserve uncommitted user work and concurrent changes.
- Work in a feature branch. Deliver small tested commits and a reviewable PR. Do not force-push, replace repository history, silently merge or publish a gameplay release without Adam's approval for that release.
- A push to `main` currently runs the Pages verification/deployment workflow. A Codex preview is not a published game. Report branch, commit, PR, actual test results and deployment status separately.
- Preserve existing saves and editor drafts. Do not clear localStorage or rename schemas/keys without a tested, explicit migration. Preserve stable item, building, container, mission and source IDs.
- Normal campaign, editor drafts, preview campaign, preview settings and preview journal must remain isolated. Old service-worker upgrade paths are regression-critical.
- Use one authoritative scene definition to derive rendering, collision, navigation and interaction locations. Do not fix a visible object while leaving a separate physics or mission anchor behind.
- Building children use local coordinates and stable instance IDs. Moving/rotating a whole building must move its contents and bindings exactly once. Do not substitute rendered mesh UUIDs for authored IDs.
- Keep existing item inspection, Atlas, mission shortcuts, audio crossfades, the calmer Relay Lanterns base score, touch/gamepad controls and offline support.
- Do not start a wholesale Three.js/Python migration merely because architecture alternatives are documented. Benchmark and propose a bounded experiment first.
- Prefer readable modules and documented schemas over another chain of version-specific inheritance and hard-coded coordinate patches. New TypeScript tooling is a proposal, not an existing project dependency.
- Preserve third-party licences and provenance. Do not embed credentials, personal access tokens or font binaries. Do not import executable scripts from editor JSON.
- Use UK English in user-facing text and give short explanations beside complex editor options. Ask unresolved product questions one at a time and only when they block the current slice.

## Verification

Use the commands in `docs/CODEX_CLOUD_SETUP.md` and the current `.github/workflows/deploy-pages.yml`. There is not currently a universal `npm test` command. Build with `python3 tools/build.py`; `dist/` is generated output.

Test changed pure logic, real mouse/keyboard interactions, editor-to-game transforms, legacy saves, preview isolation, offline upgrade and affected browser flows. Capture screenshots of actual output, not unrelated concept art. Never report Linux WebKit as physical Mac/iPhone Safari testing. Software rendering is not a device frame-rate benchmark. If browser tooling or network access is unavailable, record that limitation rather than claiming a pass.

## End-of-task checkpoint

Update `docs/NEXT_STEPS.md` with completed work, remaining work and any new decisions. Add a dated execution note with commands, results, known failures and exact commits. Leave a concise next-task instruction. Important work must be committed and, when authorised and available, pushed or attached to a PR; do not rely on a temporary cloud workspace as the only copy.

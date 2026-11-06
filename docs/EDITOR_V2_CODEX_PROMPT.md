# Start a separate Field Signal editor task

Use the same Codex environment/repository `thundercato/bunker-game`, but a NEW task and its own feature branch from the latest main. Do not interrupt or replace the running game task. This prompt targets the complete editor brief while preserving runtime ownership.

## Main prompt to paste into the NEW task

```text
Build the next major Field Signal World Editor update in thundercato/bunker-game. This is a separate parallel editor-development task; another Codex task is already working on the game/runtime. Start from latest main and use your own feature branch, such as codex/editor-v2-suite. Preserve any existing local/user work.

Before editing, read AGENTS.md and:
- docs/EDITOR_V2_MASTER_README.md
- docs/EDITOR_V2_PARALLEL_WORK.md
- docs/DESIGN_DECISIONS_2026-11-06.md
- docs/WORLD_DOCUMENT.md
- docs/MEGA_BUILD_README.md
- docs/CODEX_CLOUD_SETUP.md
Then inspect current code, recent commits and open PRs, especially PR #81 or its successor/merged state. The M0 baseline and M1 pure world compiler already exist; do not recreate them. Do not assume another task's uncommitted files are available.

Implement real editor improvements, not just a plan or a cosmetic mock-up. The complete scope is in the master README: full-map/region/layer editing; terrain sculpting and material painting; seeded foliage/rock brushes and locks; curves, roads, railways, bridges and water; complete movable building entities with synchronised in-place/focused interiors; one-sided edge resizing; textures, stairs, floors, doors and furniture; refuge/pipes/lights/audio authoring; the searchable real-model library; per-container and grouped weighted-loot tools; visual mission/source/prerequisite/objective/failure/reward authoring; APR/surge/save/sleep components; isolated playtesting, validation and safe export/release.

Start with the highest-impact independent tools: anchored one-sided floor/wall resizing, precise local-coordinate transforms, undo/redo, snapping and useful hierarchy/inspector improvements. Verify them with actual mouse/keyboard browser tests, JSON round trips and the existing preview. Continue through ready milestones with meaningful checkpoints rather than stopping at one small button or restarting the entire editor.

Respect the parallel-work ownership rules. The existing task owns the game/runtime, world compiler/schema, preview adapters, shared asset pipeline, game journal, saves and deployment. Prefer new editor-only modules and narrow tested integration edits. Do not independently rewrite those shared systems. Read current shared-file diffs before touching editor entry points. If you need a new runtime contract, document it in EDITOR_V2_INTEGRATION_REQUESTS.md and continue independent work. Consume the accepted contract at a deliberate integration checkpoint.

Preserve stable object IDs, current saves/drafts, preview isolation, licensing, controls, Atlas, item inspection, offline upgrades and Relay Lanterns. Do not migrate engines/languages or add paid services. Show whether each feature is authoring-only, exported/validated, working in actual preview or published. No pretend mission nodes, fake publishing buttons or unsupported game changes described as complete.

Use docs/CODEX_CLOUD_SETUP.md and the current workflow for tests. Add focused editor unit/browser tests, capture actual screenshots and report browser exceptions or missing assets. Do not claim physical iPhone/Mac testing from cloud Chromium/WebKit.

Commit recoverable progress in small cohesive steps. Maintain docs/EDITOR_V2_PROGRESS.md with what works, exact tests, dependencies, unresolved issues and next steps; avoid concurrent rewrites of the other task's progress docs. Continue through feasible independent work within this session, and checkpoint clearly if anything remains.

Finish with a reviewable PR, testing/preview instructions and a truthful capability checklist. Do not silently merge or publish to the live game. Ask only a genuinely blocking design question, one at a time; agreed broad choices are already recorded.
```

## Short coordination message for the EXISTING game task

```text
I am starting a separate editor task. Please read docs/EDITOR_V2_PARALLEL_WORK.md from the latest main safely without discarding your current changes. Continue your existing game/runtime campaign and keep ownership of its compiler/preview, shared schemas/assets, game journal, saves and deployment. The other task handles editor tools/UI in its own branch and must request shared changes rather than duplicate your work. Do not restart or redo M0/M1. Record your branch/PR and integration contracts in your existing progress log. The full editor scope is docs/EDITOR_V2_MASTER_README.md; no change to your current game priority is intended.
```

## Important practical notes

- New tasks start from their selected repository snapshot. Confirm that the main branch includes these three brief files. If not visible, fetch/read the latest branch using available tools without resetting local work; do not substitute an old ZIP.
- These prompts do not automatically start a task or deliver a message to an already-running one. Adam must submit them in the respective Codex tasks.
- Separate workspaces prevent direct local overwrites but do not remove merge conflicts or guarantee compatible schemas. Use the integration protocol.
- The browser/editor URL stays separate from the main play URL. A new brief is not a new live build. Publish only after the integrated editor has passed verification and approval.

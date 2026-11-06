# Field Signal: two parallel Codex tasks without competing rewrites

6 November 2026. This is a coordination contract requested with the editor brief, not proof that two cloud tasks can see each other's private workspaces.

## Current assignments

**Track A: existing game/runtime task.** Continue the current game-first campaign and necessary world compiler/game-preview work. Own game scene/rendering integration, canonical world/compiler/runtime schemas, gameplay rules, save migration, cache/deployment infrastructure, the 3D player journal and the shared model import/registry pipeline. Do not abandon existing work because an editor task starts.

**Track B: new editor task.** Implement `EDITOR_V2_MASTER_README.md`: authoring interface, tools, inspector, anchored resizing, selection/layers, asset browsing, validation and editor-side loot/mission authoring against agreed shared contracts. Start with independent editor modules and real tests. Request runtime capabilities rather than implementing a rival runtime.

At document creation, main is `0de93ec5cc97884273f53873fcea333f14f58d67`; PR #80's compiler is on main; PR #81 (`feat/moved-building-preview`, observed head `476441ee2def32752031c20124c6bbdc2077a14c`) is open/draft and owns the moved-hut preview adapter. These are snapshots, not instructions to stay on obsolete code. Inspect latest main, branches and PRs at each integration checkpoint.

## Start safely

- Each task uses its own branch/worktree. Recommended editor branch: `codex/editor-v2-suite` or a unique continuation branch. Never force-push the other task's branch or reset user work.
- Read the current root/nested instructions and the actual changed-file list of active PRs. GitHub does not expose the other task's uncommitted work; absence of a visible diff is not permission to assume its ownership has ended.
- Existing cloud tasks retain their own state. Have the existing task read this document from the latest main commit without discarding its working tree. A short message from Adam is supplied in the companion prompt file.
- Do not automatically change the editor task's base to an unreviewed runtime branch. Implement independent work from latest main; declare a stacked dependency only at an explicit integration checkpoint.

## File boundaries

### Track A owns unless expressly coordinated

`site/world-document.js` and source metadata/schema; `site/world*.js` except editor-specific UI modules; `site/layout-core.js`, `site/layout-renderer.js`, `site/layout-preview.js`; `site/terrain.js`, `site/engine.py`, `site/bridge.js`, `site/sim-worker.js`; `site/app.js`, gameplay UI/input/audio/Atlas/journal modules; `site/assets/` registry/manifests and imported game model bundles; `site/sw.js`, `site/precache.json`, release metadata, build tools and deployment workflows. The existing task may also be modifying `site/editor/world.js`, `world.html` and `bootstrap.js` to connect its preview. Treat these as HOT SHARED ENTRY POINTS until current diffs have been inspected.

### Track B preferred ownership

New editor-only modules such as `site/editor/tools/`, `site/editor/panels/`, `site/editor/ui/` or similarly coherent names chosen to fit existing conventions; editor-only tests with a distinct `editor_v2_` prefix; editor-only docs/progress such as `docs/EDITOR_V2_PROGRESS.md` and `docs/verification-editor-v2/`.

Narrow changes to `site/editor/editor.js`, `editor.css` and `index.html` may be needed to mount working tools. First inspect active diffs; keep integration edits small and isolated. This permission does not cover rewriting the whole existing editor. New tools must actually be reachable and tested, not just unimported utility files.

Do not treat these folder suggestions as new compulsory frameworks. They are ownership boundaries to minimise overlapping edits.

### Shared changes require an integration checkpoint

If a feature needs new canonical fields, prefab IDs, collision maths, game event types, worker methods, content revisions or schema migration, Track B writes a concise request in `docs/EDITOR_V2_INTEGRATION_REQUESTS.md` (create only when needed). State the consumer, payload example, validation, proposed versioning, acceptance test and missing producer capability. Track A integrates or reviews the shared contract. Track B consumes the accepted API.

Both tracks must not independently implement the same transform, weighted-loot engine, mission graph evaluator or save reset. A typed editor adapter is appropriate; a second competing authoritative database is not.

## Status and progress records

Use separate logs: Track A's existing game/mega-build progress and Track B's `EDITOR_V2_PROGRESS.md`. Do not both rewrite `NEXT_STEPS.md`, `AGENTS.md` or the root README during implementation. Propose any global overview update in the integration PR.

The editor progress log should record baseline, branch/commit, scope, changed files, dependency PR/SHA, capability status, tests/commands, actual screenshots, known failures and the exact next task. Initial status of all new tools is planned, not 'done because a document exists'.

## Integration and release protocol

1. Both tasks commit and push reviewable progress where authorised and possible. A cloud workspace is not the persistent source of truth.
2. Before integrating, compare both PRs and inspect shared-file diffs. Resolve semantic conflicts, not just Git conflict markers. No blanket 'ours/theirs' replacement of a directory.
3. Select a runtime/compiler commit that the editor was actually tested against. Update the editor branch safely using normal Git operations that preserve its commits; coordinate any same-branch collaborator before rewriting history. Never force-push shared branches.
4. Build the combined result and run unit, editor interaction, actual-game preview, old-save/draft and cache/offline tests. Test moved/rotated/raised objects and real container/mission interactions.
5. Keep one release coordinator for runtime manifests, versions, build outputs and deployment. Both task outputs may be reviewed independently; publish only after the user has approved the relevant integrated release.
6. Confirm the actual deployed revision and public-site behaviour. A PR, staging URL or successful local build is not a production release. Do not invalidate an earlier authorised bounded release merely because this broader editor brief exists.

## When work is blocked

Continue safe independent editor work: edge resizing, inspector usability, asset browsing against current registry, validation tests or graph/table authoring against existing contracts. If a runtime capability is missing, label its authoring output accurately and supply an integration request. Do not silently enable incomplete gameplay, duplicate Track A's work, or spend the task producing only unused mock panels.

## Platform note

Official Codex Cloud documentation says each task has an isolated workspace and separate working files; a new task does not recover another task's uncommitted changes. This contract is our project coordination approach, not a built-in cross-task lock manager or a promise that agents automatically message one another.

Reference: https://help.openai.com/en/articles/20001545-using-codex-cloud (checked 6 November 2026).

# Mega-build: paste this into a new Codex task

Use the `thundercato/bunker-game` repository and latest `main`. This prompt starts the ambitious game-first campaign, not the older first-M1-only task.

```text
Work in thundercato/bunker-game from the latest main. Read AGENTS.md and docs/MEGA_BUILD_README.md in full, then follow the linked handover, design decisions, WORLD_DOCUMENT.md and current progress. Build on existing work; do not recreate completed M0/M1 foundations.

This is an extensive IMPLEMENTATION task. Prioritise the playable game: a coherent rebuilt map, substantially improved licensed 3D environments, at least 50 meaningful searchable prop variants across the catalogue, a working page-turning 3D journal linked to actual missions and conversations, and polished interiors, sound, lighting and traversal. Include docks, shipping containers, railway infrastructure, fences, boulders and genuinely climbable crane access where implemented. Make the new content compatible with the World Editor and preserve saves, controls, offline support and the calmer base music.

Use substantial available task effort on useful development and verification. Do not stop at a plan, the first small improvement or a token asset swap. Work through ready milestones, committing and testing along the way. Use parallel independent workstreams only if supported, without concurrent edits to the same files. Do not invent asset licences, completed features, test passes or performance measurements.

Keep docs/MEGA_BUILD_PROGRESS.md updated. If a real task limit or blocker prevents further progress, preserve a tested checkpoint and exact continuation instructions. Open reviewable PR(s) with actual screenshots, tests, limitations and instructions to play the candidate. Do not merge or replace the live release without my approval. Start implementing now.
```

## Continue after an interruption

Continue in the same Codex task when available. Read its actual branch/working tree and `docs/MEGA_BUILD_PROGRESS.md`, identify the last tested checkpoint, and resume the next unfinished milestone. A new task must fetch the appropriate committed branch; starting from `main` will not recover another task's uncommitted work.

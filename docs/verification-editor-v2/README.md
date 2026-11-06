# Real editor verification

6 November 2026, branch `codex/editor-v2-suite`, PR #82. Linux Chromium 141,
Playwright 1.56.1, SwiftShader. These are actual editor/game captures; not concept
art, device testing or a performance benchmark. All files are from local review
of this branch, not a deployed site. See `../EDITOR_V2_PROGRESS.md` for exact
commands/results, observed errors and remaining runtime dependencies.

**Current integrated canonical evidence:** [accepted 11.1 source, 38 game-preview
checks,595-resource offline upgrades, real uppercutaways and final reports](integrated/README.md).

**Earlier continuation:** [canonical build, connected editing, offline, recovery and
validation evidence](continuation/README.md). IR-01 is resolved; the files below
retain the original checkpoint history. The separate runtime-preview evidence uses
an explicitly unmerged runtime compatibility build, not the canonical release.

- `resize-drag.png`: real 37° floor face drag; green fixed anchor and live dimension.
- `resize-result.png`: final resized floor after corner drag and JSON reload.
- `hierarchy.png`: actual selection-set UI and stable container child.
- `assets-actual-model.png`: real registered model, provenance and inspection.
- `assets-table-placement.png`: decorative placement in existing building editor.
- `world-tools.png`: actual full-map proxy workspace, region/hierarchy/path inspector.
- `loot-workspace.png`: real container/item catalogue and weighted authoring proposal.
- `missions.png`: actual source mission with edited graph and typed ports.
- `editor-station.jpg`: existing two-storey building editor regression.
- `editor-game-preview.jpg`: actual Python/WebGL search in isolated v1 game preview.

JSON reports record final interaction assertions and empty error/missing-asset
lists. `resize-run1.json` and `resize-run2.json` preserve consecutive final runs.
`logs/` retains the original pure, browser, build and failed canonical startup
record. That packaging failure was subsequently fixed and acceptance rerun using
normal dist (see the continuation). `editor-runtime-files.txt` now enumerates the
36 additive editor paths relative to accepted main `0aacdb4`; the original omission was 17 files.
It is an audit list, not a replacement release/cache manifest.

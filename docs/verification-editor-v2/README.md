# Real editor verification

6 November 2026, branch `codex/editor-v2-suite`, PR #82. Linux Chromium 141,
Playwright 1.56.1, SwiftShader. These are actual editor/game captures; not concept
art, device testing or a performance benchmark. All files are from local review
of this branch, not a deployed site. See `../EDITOR_V2_PROGRESS.md` for exact
commands/results, observed errors and outstanding packaging/runtime dependencies.

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
`logs/` holds pure, browser, build and the intentionally unresolved canonical CI
startup failure. `editor-runtime-files.txt` is the 17-file additive packaging
request for Track A, not a replacement release/cache manifest.

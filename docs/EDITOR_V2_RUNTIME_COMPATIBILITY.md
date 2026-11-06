# Explicit runtime compatibility testing

The canonical editor package on PR #82 does not include the moved-building game
adapter. Its trusted `editor/source-context.json` declares `worldPreview: false`.
The connected preview buttons are disabled and the launcher refuses to import an
absent module or create preview state. The existing stationary layout preview
remains a separate supported mode.

PR #83 (`feat/game-first-candidate`) contains the optional runtime adapter. This is
unmerged runtime work, not published functionality or an approved dependency.
The adapter accepts existing building IDs in canonical world documents; its
shareable sample URL is restricted to the hut. Its current limits are a dry,
non-overlapping placement inside the map north of the swamp, an apron of 2.5 m,
and a foundation height from 0 to 8 m. Other terrain, paths, water, proposed loot
rules and mission graphs are not activated by this building preview.

To test the actual editor against an exact available runtime revision:

```sh
git fetch origin feat/game-first-candidate
python3 tools/editor_v2_compatibility.py \
  --runtime-ref edffe7b118961406a6516ac079f706375a725ab8 \
  --worktree /workspace/editor-runtime-compat
EDITOR_COMPAT_DIST=/workspace/editor-runtime-compat/dist \
  node tests/editor_v2_preview_browser.cjs
```

Choose a fresh worktree path. The helper refuses to overwrite an existing path.
It creates a detached worktree; it does not merge or cherry-pick the runtime PR.
It retains that revision's game, canonical layout/world compiler, source metadata,
asset pipeline, worker/cache identity and runtime bootstraps. It copies only the
editor's explicitly packaged public resources, unions the explicit manifests,
sets the compatibility capability/source revision, adjusts the copied editor gate
to the exact candidate cache and adds that new gate to the candidate worker's
network-fresh routes. It then runs the runtime revision's normal build and checks
the actual built import closure. `editor-compatibility.json` records both commit
IDs, dirty editor paths, copied resource hashes and every narrow build change.

This artifact exists only for compatibility verification. It must not be used as
the canonical release build or deployed. Release acceptance uses `python3
tools/build.py` and the unchanged canonical `dist/`; the normal preview browser
suite checks that unsupported moved previews remain explicitly unavailable.

The compatibility journey edits bound contents through numeric inspector fields,
moves/rotates/raises the same complete building in the map, returns to the focused
workspace, exports/reimports/reloads the canonical document, then opens the actual
game using the adapter's existing isolated UUID payload. It uses real door Use
input, keyboard entrance traversal, physical stair ascent and upstairs movement,
search input, the hut's actual Atlas objective and normal campaign/settings/
journal/book sentinels. Individual stair/reach tests start at controlled positions
through the supported preview save importer; this is recorded fixture positioning,
not a claim that the test navigates every route uninterrupted. Screenshots and
machine-readable results are written under `test-results/editor-v2/`.

All browser evidence is Linux Chromium with SwiftShader. It is not physical Mac,
iPhone, controller-hardware or device-performance testing.

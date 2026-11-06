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

## Recorded continuation result

The explicit combined build at runtime
`edffe7b118961406a6516ac079f706375a725ab8` and editor checkout
`12293e20ae201f10de474d538f64f2ea40985b3d` plus the exact recorded public-file
hashes built 593 files and passed the strict package import closure. Its real
browser journey passed **38/38 checks**, with **0 browser exceptions and 0 failed
asset/module requests**. The game preview exercised:

| Building | Parent position X, Y, Z (m) | Yaw | Verified floors |
| --- | --- | --- | --- |
| Survey hut 03 | 35, 1.25, -48 | 90° | Ground |
| Forester’s cottage | -140, 0.75, -40 | 37° | Ground and upper, including keyboard stair ascent |
| Rail signal box | -160, 1.5, -145 | -28° | Ground and upper, including keyboard stair ascent |

Each passed real entrance Use/keyboard traversal, relocated bound-container Use
search, canonical JSON export/import/reload, isolated normal-state sentinels and
exact return to the same connected document. The hut also retained its recorder
and focused the actual Atlas on the moved mission target. Position fixtures for
stair/reach checks used the supported preview save importer as described above.
This combined journey ran online; canonical offline/cache acceptance is separate.
Later editor commits are outside this captured candidate's hash manifest.

Evidence: [browser results](verification-editor-v2/runtime-preview-compatibility.json),
[exact source hashes/build provenance](verification-editor-v2/runtime-preview-build.json),
[actual game doorway](verification-editor-v2/runtime-preview-hut-door.png), and
[actual Atlas target](verification-editor-v2/runtime-preview-hut-atlas.png).
The raw run's stair-end screenshots face the rear wall, so physical stair evidence
is the recorded input journey and height assertions rather than those images.

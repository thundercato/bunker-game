# Building-preview runtime verification

## Accepted runtime integration

PR81 and PR83 were accepted into main while the editor continuation ran. Editor
checkpoint `8cd2b24` reconciles accepted main `0aacdb4`, preserving its runtime/compiler,
campaign scenes/assets and publication work. The canonical package now includes
the moved-building adapter and enables bounded previews for existing buildings.
The normal preview browser suite now runs the three-building actual-game journey
from canonical dist; final acceptance results are recorded in EDITOR_V2_PROGRESS.md.
The accepted preview loader mounts the selected layout over the isolated base
world, then skips normal campaign enrichment when `editorLayout` is present.
Consequently this mode does not preview all 11.1 districts or other furnished
campaign homes; its inherited info label may still say Overgrowth 11.0. The game,
compiler, journal and renderer files come from accepted main 11.1 (recorded hashes),
and the selected furnished layout/semantic assets are real. Normal 11.1 campaign
content is unchanged. This is a bounded building preview, not a whole-campaign test.
Whole-map terrain/path/water/district drafts and loot/mission proposals still do
not execute. This editor PR has not been merged or published.

## Historical explicit compatibility artifact

The remainder records the earlier, explicitly unmerged test artifact and its exact
provenance. It is retained as historical evidence, not substituted for integrated
canonical acceptance.


At checkpoint `f31920a`, the canonical editor package did not include the moved-building
game adapter. Its trusted metadata declared `worldPreview: false`, and connected
preview buttons were disabled. The launcher refused to import an absent module or
create preview state. The existing local-layout preview remained supported.

At that time, PR83 (`feat/game-first-candidate`) contained the optional runtime
adapter and was unmerged, unapproved runtime work. It was subsequently accepted
through PR81, as described above.
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
tools/build.py` and the unchanged canonical `dist/`; the current normal preview browser
suite executes the accepted adapter; unsupported-runtime capability still has
explicit pure regression coverage.

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

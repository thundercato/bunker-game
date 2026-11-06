# Editor v2 current progress — 6 November 2026

Branch `codex/editor-v2-suite`, draft [PR #82](https://github.com/thundercato/bunker-game/pull/82).
Continuation began at `de5d758`; main remained `be64a7f`. Original baseline and
verification are retained in Git history and `verification-editor-v2/`. No merge,
publication, engine change, save-key migration, asset replacement or paid service.

## Execution and capability checklist

The user authorised narrow packaging/cache/bootstrap/CI changes. All other shared
runtime ownership remains respected. Inspected PR81 `476441ee2def32752031c20124c6bbdc2077a14c`
and successor PR83 `edffe7b118961406a6516ac079f706375a725ab8`; neither was merged.
Other tasks' uncommitted files are unavailable. Final remote audit observed PR83
at `e31b72a8ff4096dfd94d74297d190af4426b62dd` (still unmerged); its newly compiled
fixed road surfaces and decision notes were inspected. Full-map authoring-draft
geometry still has no runtime adapter; the compatibility run remains pinned to
`edffe7b`, not silently relabelled as the later revision.

| Area | Authored, validated and exportable in this branch | Actual game preview | Published |
| --- | --- | --- | --- |
| Canonical packaging | Original 17 omissions fixed; now 309 explicit public build files / 307 cached resources, including new tools. Build checks imports, data fetches, styles, entry modules, private files and symlink escapes. All browser suites use dist. | Current game retained | No |
| Connected world/buildings | One existing canonical envelope, lossless legacy adoption, durable global history, per-view camera/selection, actual in-world local geometry/cutaway, numeric child edits, whole-building parent placement once, canonical export/import | Existing v1 local preview bundled. Moved/raised preview disabled in main; tested for hut/forester/station only in explicit unmerged PR83 compatibility build | No |
| Interior tools | Anchored edge/corner resize and precise transforms retained; actual top-face snapping, alignment/rigid rotation, protected decorative templates with explicit concrete overrides/new IDs, wall joints, real floor landings, overlap/room isolation, support/headroom/access warnings | Concrete layout children use existing v1 adapter. Shared rotated stair/top-transition limits remain explicit | No |
| Terrain/environment | Seeded spaced brushes, scale/yaw controls, building/approach/curve/water/slope masks, visible candidates/rejections, locked erase, stable IDs. In-stroke local terrain buffers/normals and incremental foliage meshes | Terrain/roads/water/vegetation still authoring-only proxies | No |
| Assets | Existing actual-model inspection/provenance/costs retained | Reviewed decorative props use existing adapter | No |
| Loot/missions | Existing weighted proposals, simulator, typed graphs and recovery retained; real container/source links and cross-workspace validation | No weighted generator or graph evaluator is installed. Existing legacy missions/loot remain unchanged | No |
| Refuge/components | Real source-room/station/container/portal reference map, source offers and binding diagnostics. No invented empty base or gameplay switches | Actual editable local-scene/APR/surge/pod/save/sleep contracts absent | No |
| Validation/review | Fifth workspace aggregates canonical layouts/world/proposals, recovery failures, water-approach risk and region counts; clickable repairs and stale-report prevention | Checks do not substitute for an actual walk-through or approve publication | No |

## Coherent checkpoints

- `588d4f8`, `c8c44b3`, `26e4c17`, `76460f5`: canonical allow-list, dependency preflight,
  credential/private/symlink checks, CI and offline upgrade bootstrap. Final cache
  `field-signal-overgrowth-v11-editor2.1.1` distinguishes earlier review caches.
- `12293e2`, `b0419e9`, `48103fe`: canonical connected session, actual cutaway,
  portable history and incremental updates. No replacement world schema/compiler.
- `2aac23c`, `87d1985`, `9d66401`, `cab534f`: practical interior workshop, joints,
  landings, templates and quota-safe in-memory/export recovery.
- `93d1f08`, `e82f771`, `202bd23`, `1fcad60`: deterministic masks/brushes and local
  GPU-buffer updates; settings affect new dabs, never rerandomise saved instances.
- `9074355`, `b295583`, `5655855`: actual binding/refuge references, validation and
  rejected-draft visibility. `7d18f30` preserves concurrent legacy/canonical work
  and blocks navigation/preview after failed saves. `91232c6` plus shared bootstrap
  mounting adds real validated restore/download workflows for editor backups in all
  five workspaces, preserving active unsaved designs before restoration.
- `6ff6469`, `cabcd94`, `58818b1`: protect numeric fields and commands while
  asynchronous model loading rebuilds the scene; reset guards after errors.
- `131ed1e`, `700fdb9`, `2840397`, `c4e7018`: optional reviewed-adapter consumer,
  detached compatibility tooling, actual-game evidence; no runtime draft merge.

## Canonical packaging and prior-worker acceptance

The old canonical failure was reproduced as 17 omitted modules/styles/pages; it
is no longer worked around with an overlay. `python3 tools/build.py` builds the
editor through the normal manifest and fails immediately for missing modules or
required literal JSON fetches. Tests/tools, `.env`/credentials and unrelated source
are excluded. `tools/editor_v2_review.py` now delegates to the canonical build.

The suite bootstrap upgrades an old controller before importing editor code.
Real old-worker fixtures cover both the published world2 worker and the first
editor2.1 review worker. Both upgrade to editor2.1.1, cache all 307 resources,
restart all five workspaces offline at `/bunker-game/`, and retain normal campaign,
settings, journal and old draft bytes. No storage clearing is used. PR83's different
candidate cache is retained only in its isolated compatibility artifact; future
integration needs one deliberately chosen release cache, not a blanket file overwrite.

Normal CI runs all new pure and packaged browser suites plus existing game/editor
regressions. A successful PR run retains `canonical-editor-dist` for review; deployment
remains main-only and this task does not merge or deploy. The final head must have a green normal CI check before merge. Its exact run and
review artifact are linked from the PR description; a prior green head is not a
substitute. Local canonical results are recorded below.

## Runtime compatibility: exact boundary

[Compatibility record](EDITOR_V2_RUNTIME_COMPATIBILITY.md): pinned unmerged PR83,
editor checkpoint `12293e2` plus recorded public-file hashes, built in a detached
worktree without merging/cherry-picking runtime commits into PR82. **38/38 actual
browser assertions passed**, zero exceptions/failed requests: edit/move/rotate/raise,
canonical return/export/reload, real door/search actions, keyboard entry, physical
stair ascent/upper-floor movement for forester and station, moved container anchors,
hut Atlas and ordinary campaign/settings/journal/book isolation.

Individual staircase/search checks use disclosed test-save positioning, then real
keyboard/E actions. Compatibility capture was online, Linux Chromium/SwiftShader,
not physical Apple hardware or a published release. Later editor recovery/diagnostic
and visual-only changes are not represented as a new combined-runtime release.

## Verification and errors found

All local suites listed below passed against canonical dist; CI for the final
checkpoint is linked from PR82 checks and must be green before merge. Evidence is under
`docs/verification-editor-v2/`; commands and review directions are in
`EDITOR_V2_TESTING.md`. Node 22/24, Python 3.12, Playwright 1.56.1 / Chromium 141.
No physical Mac/iPhone or device FPS claim is made.

- Missing-import/startup timeout: resolved by packaging and preflight; no overlay.
- Initial CI expected the previous import toast and numeric edits raced model
  loading. Tests now check connected import plus exact layout integrity, and the
  editor disables stale numeric inputs until loading completes. Assertions were
  strengthened rather than bypassed.
- Connected inspector displays four decimals; its test now checks display precision
  and separately exact canonical coordinates. Camera tests compare the actual
  persisted navigation frame, accounting for orbit damping.
- Pure/review tests found partial mirror writes and concurrent legacy changes.
  Canonical-first recovery now retains committed designs and all conflicting raw
  versions before replacement; quota failure prevents primary writes/navigation.
- New validation reports rejected drafts as errors instead of silently validating
  a fallback. Template quota failures retain old storage and an exportable new
  in-memory design.

## Exact local verification results

- Python 3.12.14: **104 tests passed**, including eight packaging regression cases.
- All **14 editor pure suites passed on Node 22.23.4**; Node 24 also passed the
  implementation suites during development. This includes 599 anchored-resize
  assertions, 23 interior cases, 16 recovery cases, 13 brush cases, four terrain
  buffer cases, 37 world constraints and the canonical-session recovery aggregate.
- Canonical build: **309 files**, **307 cached resources**, **36 additive public
  paths** relative to de5d758. No overlay, tests, credentials or private paths.
- All 12 original/continuation editor browser scripts passed from canonical dist;
  the additional recovery suite passed eight checks (now 13 packaged editor suites).
  Main optional-preview checks prove unsupported capability stays disabled without
  missing-module fetches or fake payloads.
- New packaged journeys: assets12, bindings8, connected9, environment8, hierarchy9,
  interior13, loot10 scenarios, missions15, main-preview4, resize16, validation6,
  world12, recovery8. Zero final exceptions or missing/failed resources reported.
- Prior world2 and prior editor2.1 workers: **7 checks each**, all five workspaces
  offline, actual offline-preparation button, byte-identical saved data.
- Existing canonical editor tests: controls9, actual-game v1 editor/preview31, world2
  aggregate passed locally. CI additionally runs ci_smoke, fieldcraft and overgrowth
  (these passed on the earlier canonical continuation run before its UI-test fixes).
- Actual pinned unmerged runtime compatibility: **38/38**, three buildings including
  two physical upstairs journeys, with zero exceptions/failed requests.

One measured sculpt dab updated **42 position / 72 normal vertices out of 3,672**,
retaining geometry identity; pure tests compare every normal/position with full
rebuilds, including boundaries and distant dabs. This is bounded editor work, not
a device FPS claim. Full transaction-end refreshes and large-document stress
limits remain; terrain is still 12 m and foliage still uses authoring proxies.

The screenshot review found coplanar terrain obscuring in-world ground floors.
`c278e40` applies floor material depth bias only; authored geometry/parent poses
and colliders stay exact. The complete nine-check connected journey passed again
and the actual cutaway image was inspected.

Raw commands/results/images: `verification-editor-v2/continuation/`; exact runtime
provenance is separately recorded in `EDITOR_V2_RUNTIME_COMPATIBILITY.md`. Historical
startup/CI failures are retained and explained rather than described as passes.

## Remaining dependencies and exact next checkpoint

The full master brief is **not complete**. Available safe authoring work has advanced;
remaining physical/gameplay features require the shared interfaces documented in
`EDITOR_V2_INTEGRATION_REQUESTS.md` and `EDITOR_V2_CONTRACT_AUDIT.md`.

1. Review/integrate the actual runtime/compiler adapter from PR83 without replacing
   this editor's newer UI, recovery or packaging. Reconcile its campaign source/
   asset registry and current editor metadata; rerun all canonical/old-worker/game
   journeys. Only then enable moved preview in shipped source-context metadata.
2. Agree canonical refuge/local-scene entities, imports and renderer/collider/service
   anchors before editable base stations/pipes/lights. Current map is read-only.
3. Agree UV/support-surface/prefab schema; rotated stair opening/landing traversal
   must use the reviewed runtime fix, not a second editor collision algorithm.
4. Agree material masks/finer terrain, bridge deck/support/physics, foundation
   footprint policy and water overlap/depth/dry exclusions before exposing those
   authoring fields or claiming full-map runtime geometry.
5. Consume shared weighted-loot and mission graph APIs when produced. No duplicate
   loot/game evaluator, guarantees/overflow policy, timer units or reset rules are
   silently invented. APR/surge/pod/checkpoint/sleep definitions remain absent.

Until those accepted adapters exist, new switches saving unused gameplay JSON
would misrepresent functionality and are deliberately not added. No merge/live
publication is authorised by this checkpoint.

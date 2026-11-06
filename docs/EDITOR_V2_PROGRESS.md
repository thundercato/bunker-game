# Editor v2 continuation — 6 November 2026

Branch `codex/editor-v2-suite`, draft [PR #82](https://github.com/thundercato/bunker-game/pull/82).
Started from `de5d758`, preserving its completed tools. The first continuation
checkpoint was `f31920a` (49 commits). While final checks ran, PR83 was merged into
PR81 and PR81 into main; main reached `0aacdb4`. GitHub then blocked PR82 checks on
real merge conflicts. `8cd2b24` reconciles that **accepted main**, preserving both
the 11.1 game/runtime work and this newer editor. This task has not merged PR82,
published it, changed save schemas or rewritten the other task's progress notes.
Final fetch observed main `220fb45`: publication/native documentation only, with
no additional runtime changes. `6448145` preserves those accepted notes/instructions.
The other task verified/published game 11.1; this editor suite is still unpublished.

## Latest startup and package follow-up

Public source `e3719db` follows the complete 2.1.3 acceptance below. Only the
network-fresh suite gate changed among the 598 public files; all other hashes,
accepted runtime files, cache label, save keys and draft formats are unchanged.
Normal CI42292276042 passed all 14 editor suites and three offline variants, then
timed out starting the fourth (prior editor2.1.2). Its cause remains unconfirmed;
five instrumented local repeats of the original package passed 7/7 each.

The gate now reuses installing/waiting workers and treats an InvalidStateError
handoff as a reason to recheck, never as readiness. Expected controller-cache
verification and the original polling bounds remain mandatory. Nine deterministic
activation cases plus the existing seven adapter cases pass. Offline failures now
retain console/status/worker/cache diagnostics and screenshots. Reports distinguish
navigation-cancelled background requests from real network failures.

The package validator now rejects changed canonical bytes and extra shipped files,
including tests/private material. CI runs that check again after browser acceptance
and before artifact upload. A successful final-head CI/artifact remains the review
gate linked from PR82. This workspace's artifact storage host returns HTTP403;
CI performs the exact-byte verification, with no local artifact-unpacking claim.
Evidence: [startup follow-up](verification-editor-v2/editor213-upgrade/README.md).

Final local follow-up on exact `e3719db`: **173 Python / zero skips, all 16 pure
suites (including nine activation cases), four offline variants 7/7 each, controls
9/9, retained actual-game editor/preview 31/31, post-browser 598 exact bytes/no
extras**. All exception/console/HTTP/genuine-network-error arrays are empty;
background navigation cancellations remain visible in the reports. Final normal
CI reruns the entire suite on the pushed review head before upload.

## Full 2.1.3 continuation acceptance before the startup follow-up

Code `8567fc7` follows green canonical checkpoint `7bd5db1`, verified by normal
[CI 42285211842](https://github.com/thundercato/bunker-game/actions/runs/42285211842).
The packaging blocker is genuinely resolved; that green artifact is historical
2.1.2. Final 2.1.3 CI must pass on the final head, with its exact artifact linked
from PR82. No PR merge/deployment has occurred.

Two ready acceptance gaps were addressed while CI ran:

- **Practical full-map storage:** thirty duplicated snapshots made a 1,000-instance
  draft approximately 11.5 MiB. Lossless adjacent snapshot deltas now retain the
  canonical document, legacy mirror bytes and complete history. A real Chromium
  origin saved 5,000 UUID instances/three interiors/thirty frames; all hashes survive
  actual reload/navigation/undo/redo. Thirteen browser checks passed, with zero exceptions or
  failed requests and eight normal/preview namespaces byte-identical. UTF-16 key/value
  accounting: 3,168,256 bytes; this is not a measured device quota. Legacy full history
  still loads; accepted 60-state histories retain every transition as stacks move.
- **Generated landing physics:** a real anchored upper-floor resize removes support
  behind the stairs. The landing tool creates the only floor supporting that point;
  actual continuous W traversal reaches it from the stair ascent, without restoring
  onto it. Focused station 17/17 passed, rendered/worker world Y 4.7 matching. Full
  strengthened 41/41 three-building regression also passes, including authoritative
  movement for every entrance/stair/upstairs check.

The landing check also caught a test defect: Playwright's async wait predicate was
truthy before its promise resolved and did not poll. Both waits are synchronous
now, with actual entrance coordinates and authoritative worker movement required.
Earlier 38-check reports are retained, but their movement acceptance is superseded
by the strict 41-check result. No gameplay source change was required.

Current build: **598 explicit public files / 596 cache resources, 37 editor additions
relative to accepted main**. Cache/bootstrap/runtime-ready agree on
`field-signal-11.1-editor2.1.3`. A fourth exact prior-worker fixture covers review 2.1.2.
Normal CI includes 16 editor pure suites and 14 packaged editor browser suites.
Python 173 and all 16 pure suites on Node 22 pass, including 12 history cases with
120 seeded vectors and 24 recovery cases. All 23 local browser executables pass;
final-head CI remains the review gate. Evidence: `verification-editor-v2/editor213/`.

Current local tally: **all 23 canonical browser executables passed**, zero final
exceptions/missing resources/failed requests. Fourteen editor scripts: assets 21,
bindings 8, connected 10, environment 8, hierarchy 9, history 13, interior 13, loot 10,
missions 15, strict preview 41, recovery 8, resize 16, validation 6, world 16. Four prior-worker
runs passed 7 checks each. Furnished-home 20, controls 9, legacy editor/game 31, world-v2
aggregate and moved-preview 15 also passed. Source stayed frozen `8567fc7` throughout.

The generated floor's final renderer/worker local position was `[4.5,3.2,-4.11]`,
world Y 4.7, beyond both the retained floor rear edge -3.05 and stair support -3.75.
Only the new landing provides support there; no restore occurs between ascent and
arrival. New actual captures/results/hashes are in `verification-editor-v2/editor213/`.
The earlier sections below remain an explicitly historical checkpoint record.


## Execution and capability checklist

1. **Done:** reproduce and fix IR-01 with the canonical build, dependency guard,
   explicit manifest, bootstrap/cache integration and normal CI.
2. **Done:** connected canonical authoring, practical interiors, deterministic
   environment tools, validation and recoverable drafts.
3. **Done:** consume the accepted runtime adapter/campaign source/assets/districts;
   strict three-building 41/41, all four offline upgrades and retained-editor
   regressions pass. Final-head CI completes the review gate.
4. **Next dependent checkpoint:** reviewed refuge/component, UV/support/prefab,
   terrain/bridge/water and weighted-loot/graph contracts; see integration requests.

| Area | Authored, saved and validated | Actual game preview | Published by this task |
| --- | --- | --- | --- |
| Canonical packaging | Original 17 missing files fixed. Current 598 explicit public files / 596 cache resources, 37 editor additions relative to accepted main. Imports, entry modules, data resources and private-path exclusions checked before browser startup | Existing 11.1 runtime preserved | No |
| Connected buildings | One existing world-document envelope, legacy adoption, global durable history, selection/cameras, actual in-world cutaway, child-local edits and one parent transform; canonical JSON and recovery | Accepted main adapter now bundled/enabled for one selected existing-building layout over its isolated base world; other campaign/district content is outside that preview. Strict 41/41 passed for hut, 52-object Forester and station, with both worker/rendered movement and a newly authored physical landing. Earlier 38/compatibility retained as history | No |
| Interiors | Anchored resizing/local transforms/snapping retained; top-face snapping, alignment/rigid assemblies, safe templates/newIDs, wall joins, actual floor landings, overlap/room isolation and support/headroom/access diagnostics | Existing layout adapter retained, with accepted floor/binding/stair/roof fixes. A newly authored station landing is physically verified after an anchored floor resize; arbitrary arrangements/rotated openings still need a walkthrough | No |
| Campaign/model library | Exact actual furnished scenes adopted only when no draft exists; complete shared registry; 214 real models/appearances, 107 reviewed decorative placements; semantic variants and authored-collision models inspected without invented bindings | Uses accepted runtime geometry. Existing container identities/loot stay attached | No |
| Terrain/environment | Seeded spacing/scale/yaw/masks, candidate rejection, locked erase, stable instances, bounded in-stroke position/normal updates and incremental foliage meshes | Terrain/path/rail/water/foliage draft changes remain authoring-only | No |
| Districts | Accepted 95 stable entities retained; field proxies, hierarchy/layer/hide and numeric canonical transforms; undo/export/reload | District draft transforms remain authoring-only | No |
| Loot/missions | Real 143-container campaign source, grouped weighted proposals, seeded simulation, typed graphs and real source/target links | No accepted weighted generator or graph evaluator; existing game missions/loot preserved | No |
| Refuge/components | Actual source rooms/services/radio/offers/storage/transitions inspected; read-only reference map and diagnostics | Editable local-scene/APR/surge/pod/save/sleep contracts absent | No |
| Recovery/validation | Lossless history fixes ordinary forest quota failures; legacy history/recovery retained. All five workspaces offer exact backup download and validated restore; active unsaved work backed up first. Snapshot validation includes assets/references/interiors/water/regional counts and stale export prevention | Diagnostics do not approve publication or replace physical walkthrough | No |

## Recoverable implementation checkpoints

- `588d4f8`, `c8c44b3`, `26e4c17`, `76460f5`: explicit production packaging,
  import/data/private/credential/symlink checks and CI; no overlay required.
- `12293e2`, `b0419e9`, `48103fe`: canonical session, actual cutaways, portable
  history, selection and bounded brush redraws; no replacement schema/compiler.
- `2aac23c`, `87d1985`, `9d66401`, `cab534f`: practical workshop, joints/landings,
  concrete template overrides and quota-safe in-memory export.
- `93d1f08`, `e82f771`, `202bd23`, `1fcad60`: deterministic brushes/masks and local
  terrain GPU-buffer updates, with stable saved IDs and no forest reroll.
- `9074355`, `b295583`, `5655855`: real bindings/refuge references and fifth
  Validation workspace; rejected draft bytes are errors, not silently replaced.
- `7d18f30`, `91232c6`, `dd439d0`, `e5ef555`: concurrent/partial mirror recovery,
  save failure navigation guards and actual backup restore/download in all five views.
- `6ff6469`, `cabcd94`, `58818b1`: disable stale controls during asynchronous model
  rebuilds and recover the guards after failures.
- `c278e40`: floor-only material depth bias fixes coplanar terrain hiding cutaway
  floors; authored geometry, parent poses and collision are unchanged.
- `8cd2b24`: reconcile accepted main, preserve runtime publication workflow and
  shared fixes, consume verified campaign source/assets/real furnished interiors,
  preserve district authoring, enable canonical connected previews and add a
  released 11.1-worker upgrade fixture. No runtime logic was independently rewritten.
- `bc22827`, `a7d3fd8`, `0f39d72`, `544a1e2`, `75c709c`: accepted binding-floor
  policy across tools, true upper-storey cutaways, canonical approach diagnostics
  and accurate current-model inspector. `af8a2e2`/`00f3f59` adapt actual geometry
  fixtures without replacing game interactions. `5056290` synchronises catalogue
  metadata with tested shared registry counts.

## Canonical package and cache

The original 17-file omission was reproduced before changes. Normal
`python3 tools/build.py` now includes the editor explicitly and fails immediately
for missing imported modules, bootstrap targets or required literal data fetches.
Tests/tools/build-only dependencies, credentials/private paths and escaping
symlinks are excluded. `tools/editor_v2_review.py` delegates to the normal build.
No overlay is used by release tests or CI.

After accepted main arrived, its 559 public resources were retained in their
existing order, then 37 missing editor resources added. Current package: 598 explicit
files / 596 cache resources. The shared worker, runtime-ready helper and suite gate
agree on `field-signal-11.1-editor2.1.3`. Old public caches retire only after a full
successful cache-all. No localStorage clearing, campaign/draft-key migration or
runtime/asset replacement is used.

**Prepare editor for offline** starts the actual cache action; **Recover editor
backups** validates restore choices and offers exact rejected bytes for download.
CI includes all editor suites, runtime/campaign/journal regressions and all four prior
worker fixtures. A successful PR run retains `canonical-editor-dist`; deployment
remains main-only. Final-head checks and the review artifact are linked from PR82.

## Earlier 2.1.2 integrated verification (strict movement superseded)

Final local canonical acceptance passed all 13 packaged editor browser suites and
all three seven-check prior-worker upgrades. All retained editor regressions passed;
final-head normal CI must be green before merge. Its exact run/artifact
are linked from PR82. No earlier green head substitutes for that gate.

- Python 3.12.14: **173 tests passed, zero skips**. The initial run's five geometry
  skips were resolved by installing the required development-only Shapely 2.1.2.
- Node 22.23.4: **all 15 editor pure suites passed**, including 599 anchored-resize
  assertions, 30 interior cases, 16 asset cases, 16 recovery cases, 9 accepted-source
  checks, 13 deterministic brush cases and 4 dirty-terrain cases. Existing runtime
  pure suites also passed; full commands are in `EDITOR_V2_TESTING.md`/normal CI.
- Canonical build: **597 explicit public files / 595 cache resources**, 36 additive
  editor paths relative to accepted main, including every original 17 omission.
  No overlay, private/test material or development-only dependency is shipped.
- All 13 packaged editor browser suites: **assets 21, bindings 8, connected 10,
  environment 8, hierarchy 9, interior 13, loot 10 scenarios, missions 15,
  integrated-preview 38, recovery 8, resize 16, validation 6, world 16**. Zero final
  exceptions or missing/failed resources reported. World 16 includes four actual
  district transform/history/visibility/round-trip journeys.
- Actual **38/38 canonical game-preview checks**: hut, furnished 52-object Forester
  and station. Full edit→move/rotate/raise→focused return→JSON/reload→real game
  journey; real doors/search, both physical stairs/upstairs, hut Atlas, exact design
  return and normal campaign/settings/journal/book isolation. This passed separately
  from the historical unmerged compatibility 38/38; it uses accepted runtime files.
- Prior world2, editor2.1 and released 11.1 workers: **7 checks each**, all 595 cache
  resources installed via actual Prepare editor for offline button, all five views
  restarted offline under `/bunker-game/`. Campaign/settings/both legacy journals/
  current structured book/existing preview namespaces/old drafts stayed byte-exact.
- Existing moved-building runtime suite: **15/15**, including offline searched-loot
  persistence, exact draft return and shareable startup with storage unavailable.
- Furnished-home suite: **20/20**, including the rendered upper cutaway with all
  **92 exact colliders unchanged**. Existing controls: **9/9**; existing editor/game
  preview: **31/31**; world-v2 aggregate passed, including retained 95 district IDs.
  Normal CI also runs smoke/controller/offline, inventory/Atlas/inspection,
  overgrowth, physical journal and complete campaign suites.
- Existing world audit: **264 navigation checks, 0 errors/0 warnings**. Generated
  campaign road polygons match their authoritative routes/source/generator.

Screenshots/logs/reports are under `verification-editor-v2/integrated/`. Its local
browser package was built at `af8a2e2` with per-file hashes. Later public changes
are release.json catalogue-count metadata only (`5056290`), with a consistency
regression; final CI checks/builds that exact final head. No editor/game module,
HTML or CSS changed after that captured package. Earlier f31920a canonical 309/307
and edffe7b compatibility records remain in their clearly historical folders.

Controlled save import positions the isolated player at stair/search fixtures;
real keyboard movement and Use/ray selection then execute. The selected-building
adapter overlays its isolated base world; other normal 11.1 campaign districts and
world draft geometry are outside this preview. Linux Chromium 141/SwiftShader,
Playwright 1.56.1: no physical Mac/iPhone/Safari/controller-hardware or device-FPS claim.

Errors found and corrected: omitted imports; stale import-toast expectation;
asynchronous numeric-input races; partial/concurrent mirror writes and quota-loss
navigation; rejected-draft fallback validation; coplanar floor visibility; opaque
upper-storey cutaways; centre-based diagnostics ignoring canonical interaction
anchors/support floors; inspector showing the wrong current model; stale catalogue
release counts. Invalid old test fixtures aimed at empty workbench space or inside
a real bedroom wall. They now target actual drawers/clear authored floors, retaining
all real input, stair, search, Atlas and isolation assertions. No engine bypass or
weakened assertion was used to obtain a pass.

One measured sculpt dab updates **42 position / 72 normal vertices out of 3,672**,
retaining geometry identity; pure comparisons include complete normals/positions
and distant dabs. Full refreshes can occur at transaction boundaries; large-document
stress limits and the 12 m terrain format remain. This is not a device FPS result.

## Remaining work and precise dependencies

The full master brief is **not complete**. Accepted main unblocked bounded building
previews; it did not add the other producer interfaces.

1. Retain final-head green CI and review the bounded preview evidence before any
   merge. No merge/publication is performed by this task. Next implementation work
   needs a reviewed producer contract below; current canonical authoring and
   three-building/old-worker journeys are implemented and tested.
2. Lossless editable refuge requires stable scene/fixture/station/transition IDs and
   coupled renderer/collider/service anchors. Current reference map stays read-only.
3. UV/support-face/prefab schema and binding remap/override policies are absent.
   Templates expand unbound concrete children; no linked prefab or building cloning.
4. Fine terrain/material masks, foundation footprint cut/fill ordering, editable
   bridge deck/support physics and water overlap/depth/dry exclusions require shared
   versioned definitions. Fixed campaign roads are not an editor-draft adapter.
5. Shared weighted draws/mission graphs need one runtime API and persistence rules.
   Do not invent mission guarantees, overflow, timers or reward/reset semantics.
   APR/protection/surge/pod/checkpoint/sleep component definitions remain absent.

Continue the next accepted producer contract with editor consumption and identical
seeded/runtime test vectors, rather than creating a second gameplay engine. PR82
remains a draft; no merge or live publication is authorised by this task.


Additional measured limits: the 5,000-instance storage journey deliberately hides
foliage rendering. Dense-scene GPU budgets and physical-device tests remain. The
12,000-instance UTF16 checkpoint+mirror estimate is 6.723 MiB, so some quotas can
still fail; pending-mirror recovery and export guards retain the design/history.
No backups/history/saves are deleted to fit a quota. See EDITOR_V2_CHECKPOINT_HISTORY.md.

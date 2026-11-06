# Historical 2.1.2 integrated evidence

Current [2.1.3 evidence](../editor213/README.md) supersedes movement polling in
this record: two async wait predicates did not poll, and the strict 41 result now
requires rendered and worker movement. Packaging here genuinely passed normal CI
42285211842; it is not the current release artifact.

All 20 serial browser cases passed against the ordinary production package: 13 editor
suites, 3 prior-worker upgrades, furnished-home 20, controls 9, existing editor/game 31
and world-v2 aggregate. [Exact machine summary](acceptance-summary.json),
[progress/capability matrix](../../EDITOR_V2_PROGRESS.md) and
[commands/review journeys](../../EDITOR_V2_TESTING.md).

No overlay or unmerged runtime is used. Accepted main 11.1 compiler/game/render/save/
audio files are retained. `local-browser-package-provenance.json` identifies the
frozen af8a2e2 browser package; fixtures were corrected in `00f3f59`. The subsequent
release.json-only change `5056290` fixes catalogue-count metadata. Final
`package-provenance.json` hashes all 597 explicit public files (595 cached resources
plus SW/manifest); `.nojekyll` is an additional deployment marker. It verifies that
release.json is the only changed public byte source after the local browser batch.
Final-head normal CI runs the entire suite again and retains canonical-editor-dist;
its exact run/artifact is linked from PR82. This editor PR is not merged or deployed.

## Actual editor captures

- [Opened authored upper storey](forester-editor-upper.jpg): real 52-object Forester,
  bath/bedroom/stairs and opened front/east walls; all 92 physical colliders unchanged.
- [Connected in-world cutaway](connected-cutaway.png) and
  [focused return](connected-interior.png): one canonical document/parent transform.
- [Actual registered campaign model](assets-campaign-model.png) and
  [semantic appearance](assets-search-appearance.png): shared geometry/provenance,
  measured costs and honest placement limitations.
- [Anchored mouse drag](resize-drag.png), [JSON-reloaded resize](resize-result.png)
  and [interior workshop](interior-workshop.png): actual interaction output.
- [Bounded terrain updates](environment-terrain-local-update.png),
  [district proxy](district-proxy-edit.png) and [real refuge references](refuge-references.png).
  District/terrain edits remain authoring-only; refuge references are read-only.
- [Validation](validation.png), [backup recovery](recovery-backups.png) and
  [storage failure preserving the exportable design](world-storage-recovery.png).

## Actual game and offline captures

- [Moved hut doorway](preview-hut-door.png) and [actual Atlas target](preview-hut-atlas.png).
- [Forester upper landing looking down real stairs](preview-forester-stairs.png),
  [moved workbench search](preview-forester-search.png) and
  [station stair journey](preview-station-stairs.png).
- Released 11.1 worker→new cache→offline restart: [World](offline-world.png),
  [Interior](offline-interior.png), [Loot](offline-loot.png),
  [Missions](offline-missions.png), [Validation](offline-validation.png).
  Three independent seven-check reports cover world2, editor2.1 and released 11.1.

The 38-check canonical journey uses the accepted bounded selected-building adapter,
not a whole campaign/district preview. Disclosed isolated-save positioning stages
stairs/search; real keyboard movement/ray selection/Use then execute. Linux
Chromium 141/SwiftShader with low-quality game fixtures is not physical Mac/iPhone,
Safari/controller-hardware testing or a target-device FPS measurement. These are
actual captures, not concept art. Earlier continuation/compatibility evidence keeps
its original attribution in the neighbouring folders.

Portable authored proof: [connected world](connected-world.json),
[resized layout](resized-layout.json), [validation report](validation-report.json).
The logs retain the initial invalid semantic-geometry fixture separately from all
final passing results; no assertion was weakened or gameplay action bypassed.

Archived console output only normalises trailing whitespace; reports/images and
public-file hash manifests retain their original content.

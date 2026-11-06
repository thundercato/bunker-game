# Editor 2.1.3 canonical acceptance

[Final startup follow-up](../editor213-upgrade/README.md) records source `e3719db`,
its sole public gate change, nine lifecycle regressions and exact-byte CI guard.
The later fourth-worker CI timeout and unconfirmed cause remain visible there.

This is the normal production package, no overlay or competing runtime. Frozen
source `8567fc7` builds 598 explicit public files / 596 cached resources (plus the
.nojekyll marker); per-file hashes are in package-provenance.json. Accepted game,
compiler, renderer, saves, journal and audio modules remain unchanged from main.
The shared cache/bootstrap changes use field-signal-11.1-editor2.1.3.

The new history browser passed 13/13: actual 5,000 UUID instances, three interiors,
thirty frames, identical hashes across reload/navigation and real undo/redo; old
full-snapshot conversion; exact concurrent/corrupt backup bytes; eight normal/
preview namespaces preserved. Zero exceptions, failed requests or missing resources.
[Dense-checkpoint UI](history-dense-checkpoint.png) ·
[Rejected-history recovery](history-corrupt-recovery.png) ·
[Machine result](history-browser.json).

[Checkpoint format/capacity/limits](../../EDITOR_V2_CHECKPOINT_HISTORY.md) explains
the lossless metadata and raw measurement tables. Node UTF16 estimates are not
physical browser quotas. Dense foliage is deliberately hidden in this storage
journey, so it is not a rendering/FPS measurement.

The strengthened game suite requires synchronous polling of both rendered and
worker positions. Its new station example resizes the upper floor with its front
edge fixed, creates a real concrete landing as the only support behind the stairs,
then continues actual keyboard ascent onto it without teleporting there. The
focused 17-check scenario passed with rendered/worker world Y 4.7 matching. Full
three-building 41/41 also passed, with worker/rendered movement required throughout.
All 23 canonical executables passed: 14 editor suites, four offline variants and five
retained game/editor scripts. [Exact summary](acceptance-summary.json) records
counts and empty exception/missing/request-failure arrays. Furnished-home 20,
controls 9, legacy editor/game 31, world-v2 aggregate and moved-preview 15 passed.

Actual current captures:

- [New landing authored after an anchored resize](preview-station-new-landing-editor.png)
  and [continuous game arrival](preview-station-new-landing-game.png). Both renderer
  and worker end local `[4.5,3.2,-4.11]`, beyond the old floor/stair support, world Y 4.7.
- [Opened furnished upper room](forester-editor-upper.jpg) and
  [real physical stairs](preview-forester-stairs.png).
- [In-world cutaway](connected-cutaway.png), [focused return](connected-interior.png),
  [actual resize drag](resize-drag.png), [actual Atlas](preview-hut-atlas.png).
- All five workspaces after prior-review2.1.2 upgrade and offline restart:
  [World](offline-world.png), [Interior](offline-interior.png), [Loot](offline-loot.png),
  [Missions](offline-missions.png), [Validation](offline-validation.png).

[Portable connected design](connected-world.json) includes the generated floor
and stable bindings. Console snapshots only normalise trailing whitespace;
JSON/images and public-file hash manifests preserve their original content.

Earlier integrated 2.1.2 evidence/green CI is retained in ../integrated/. Its async
movement wait was corrected and superseded by strict 2.1.3 polling; never infer
current physics acceptance from those older waits. The original packaging blocker
was genuinely resolved in normal CI42285211842 at `7bd5db1`. The latest PR head must
pass normal CI again and retains canonical-editor-dist; no PR merge/deployment.

Actual Linux Chromium 141/SwiftShader captures are not physical Mac/iPhone/Safari
or controller-hardware testing. The accepted game mode previews one selected
building over its isolated base world, not all campaign/district/terrain edits.

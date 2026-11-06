# Field Signal game-first campaign checkpoint

6 November 2026. Active campaign branch: `feat/game-first-candidate`. The latest
explicit user instruction requires approval before production replacement. PR #81
is draft and unpublished; its earlier release intent is superseded.

The new game-first brief arrived concurrently on `main` while
the already-requested M1 building preview was being finished. Its documentation
was merged into `feat/moved-building-preview` without replacing that work. This
file records actual completion, not the desired scope as shipped functionality.

- [x] M0 baseline, tests and initial cloud measurements: PR #80 and
  `EXECUTION_2026-11-06_M0.md`. Do not repeat the baseline/compiler as a new project.
- [x] M1 versioned world-document/compiler: PR #80.
- [x] Bounded moved/rotated/raised building actual-game preview: PR #81; existing
  interior, furniture, collision, doors, containers, loose surfaces and mission
  target remain linked. Normal/preview save/settings/actual-v9 journal isolation.
- [x] Real mouse/keyboard, old-worker upgrade, offline reload, draft return,
  legacy preview and shareable play link checks. 107 Python tests, pure JS suites
  and all seven browser suites passed locally; screenshots/logs committed.
- [ ] Production publication: approval required for the final reviewed candidate; no merge/deploy is being performed.
- [x] Machine-readable world audit; 263 actual navigation checks, all 143 effective containers searchable, existing 139 retained; transport overlaps and buried rail/pier floors corrected.
- [ ] Village street/two-storey house/woodland/crossing art and gameplay slice.
- [x] Structured journal and physical page-turning 3D viewer implemented; 32 pure and 21 component-browser checks passed. Full-game integration/QA in progress.
- [x] Five verified Kenney CC0 packs; 91 optimised GLBs plus shared atlases/licences (1.91 MB complete package); 69 articulated search variants and actual thumbnails. Eight district scene definitions implemented.
- [ ] Whole-map terrain/roads/water integration and subsequent mechanics.

Normal play remains Overgrowth v11. No new asset packs, engine migration, Python
removal, surge/APR/save-rule replacement or full v12 release is claimed here. The
preview uses the existing licensed asset library and retains Relay Lanterns.
Measured limitations and target-device testing remain in the M0 execution note.

Next coding task after release verification: follow `MEGA_BUILD_README.md` game-first
priority. Audit actual world data/assets and select the flagship playable region;
implement a coherent visible improvement and structured journal slice using this
shared-world foundation. Do not rebuild M0/M1 or spend another task on editor-only
proposals. Keep each new content/mission/collision reference stable and testable.

Release evidence and exact implementation commits:
`EXECUTION_2026-11-06_BUILDING_PREVIEW.md` and
https://github.com/thundercato/bunker-game/pull/81 .

## Active implementation checkpoint

- Four authored homes: 198 objects, 96 purposeful furniture props, 28 windows and
  19 lamps; complete stair landings/return paths tested.
- 68 catalogue variants actually placed; four new quayside/gantry searches, with
  all original IDs/loot/mission rewards retained.
- Crane has three real bidirectional climbs, explicit external-ladder waypoints,
  guarded decks and canonical endpoint saves during the visual transition.
- Candidate source, JS movement, Python rules, editor asset catalogue and normal
  versus preview journal isolation are connected. First full-game boot reports no
  asset/scene errors; wider browser scenes, complete QA/performance and PR packaging
  remain in progress. Main and the public game are unchanged.

Coherent commits are being made on the shared campaign branch. See component docs
CAMPAIGN_ASSETS, SEARCH_PROP_CATALOGUE, CAMPAIGN_INTERIORS, DISTRICT_CANDIDATE and
WORLD_AUDIT for exact provenance, APIs and measurements. No new mechanics such as
surges/APR/fatigue are claimed by these completed components.

# Field Signal game-first campaign checkpoint

6 November 2026. The new game-first brief arrived concurrently on `main` while
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
- [ ] PR #81 final CI → authorised Pages publication → actual public-link proof.
  The follow-up user request explicitly asks for a playable link for this bounded
  update. Do not infer approval of a later large overhaul release from this item.
- [ ] Machine-readable whole-world audit and flagship-region defects/budgets.
- [ ] Village street/two-storey house/woodland/crossing art and gameplay slice.
- [ ] Structured event journal and tactile 3D journal MVP with accessible fallback.
- [ ] Broader licensed asset curation, optimisation and district expansion.
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

# Field Signal game-first campaign checkpoint

6 November 2026. Branch `feat/game-first-candidate`, stacked on the unpublished
moved-building preview in PR #81. Main/public play remains Overgrowth v11. The
latest user instruction requires approval before production replacement. No merge
or Pages deployment is authorised by this campaign.

## Completed implementation

- M0 baseline and M1 world-document/compiler were already delivered by PR #80.
  They were reused, not recreated. PR #81 adds the bounded moved/rotated/raised hut
  actual-game preview with normal/preview save, settings and journal isolation.
- Five downloaded, verified Kenney CC0 packs supply 91 curated GLBs, four atlas
  source images, exact licences, source hashes, actual thumbnails and a repeatable
  importer. Complete campaign asset package is about 1.91 MB. See CAMPAIGN_ASSETS.
- 69 meaningful searchable visual variants: 65 original composite models and four
  existing licensed mesh models. 68 distinct variants are placed in the candidate;
  the catalogue's 69 thumbnails are rendered from the real geometry. Hinges and
  drawers respond to actual persistent container searches. See SEARCH_PROP_CATALOGUE.
- Four authored homes have 198 objects, 96 furniture props, 28 windows and 19
  lights. Kitchen, dining/living, bedroom and bathroom layouts retain 17 original
  container bindings, four loose-loot surfaces and all eight bound doors. Physical
  floors and front search anchors are compiled from the same editor objects.
  Complete stair landings and return paths are repaired. Pitched roofs preserve
  the exterior silhouettes and expose an optional rise in the building editor.
- Eight district scene sets contain 95 stable entities: village15, woodland21,
  crossing8, railway9, docks13, utilities9, western ridge7 and refuge13. They include
  fences, fallen timber, boulders, ballast, rail vehicles, power cables, refuge
  services, cargo stacks and a three-level gantry. Decorative geometry is merged
  by material in distance-culled 24m cells. These are additions to the existing map,
  not a claim that every geographic region has been rebuilt.
- Four new quayside/gantry search bindings bring the effective total to143. All
  original139 container IDs, loot profiles, guaranteed mission items and rewards
  remain. Road indices/building origins stay stable; detours remove existing
  road/rail intersections with buildings. Full rail-route terrain flattening,
  pier floor and the buried car7 search height are corrected.
- Gantry ladders have three real bidirectional routes, external-ladder waypoints,
  guarded decks, landing-specific Use choices and canonical endpoint saves during
  the visual transition. The boom/hook are scenery, not a lifting simulation.
- The physical Three.js notebook has covers, page edges, rings and a deforming
  turning sheet. DOM reading pages provide current assignments, actual archive
  outcomes/rewards, encountered observations/communications, reference and notes.
  HUD, Pack, N, pause, keyboard, swipe and controller routes are connected. Battery
  saver/reduced motion use a readable2D mode. Rendering runs only while needed.
- Structured records use stable dedupe IDs, bounded browser-local storage and an
  explicit non-destructive v9 journal import. Actual greetings and displayed Vera
  rumours are recorded after contact; there is no invented full transcript history.
- Normal and editor preview have separate new-book stores as well as their existing
  separate save/settings/legacy journal keys. New homes/search props load in the
  editor and isolated actual-game preview. Full-map drafts preserve district IDs,
  transforms, colliders, climb children and container bindings; district geometry
  is represented by selectable proxies with numeric transform fields.
- Exact candidate credits and all runtime assets are included offline. Candidate
  metadata says unpublished. CI packages a downloadable build and restricts Pages
  deployment, including manual workflow dispatches, to main.

## Integration fixes and verification

The actual integration pass found and fixed a climbing/rAF conflict, a climb-death
pose restoration bug, actor collision using the player's floor, journal keyboard
focus/activation conflicts, stale pin badges and missing model registration in
isolated authored-home previews. Candidate sight lines now clip a segment against
rotated boxes instead of scanning every collider at each15cm sample. The measured
40–50m clear-line CPU medians fell from44–49ms to0.45–0.59ms for the reviewed lines;
this is a geometry routine measurement, not a physical device frame-rate claim.

The machine-readable audit currently checks264 navigation approaches/spawn
clearance with zero errors/warnings. It distinguishes the original139-container
source from the143-container effective candidate. Final local checks pass:165 Python tests;13 Node suites plus51 syntax checks;
25 full-game,19 authored-home preview,31 notebook and15 moved-building browser
checks. Final PR CI also runs the existing regression suites. Actual screenshots,
metrics and exact play/continuation instructions are in
`EXECUTION_2026-11-06_GAME_FIRST.md`; current remote status is in PR#83 checks.

## Remaining scope and continuation

The eastern bank, military compound and southern bog still need the substantial
art/traversal passes in the brief. Most remaining houses keep their v11 interiors.
There is no surge/APR/pod/checkpoint/fatigue/drowning rewrite or engine/Python
migration. Full-map terrain, roads, water and district-transform drafts still do
not compile into normal gameplay; only the existing bounded hut preview consumes
world-building transforms. The new district draft inspector is authoring support.

Journal notes/history remain separate from campaign JSON backups and survive
replacing the campaign slot. The archive follows the current campaign's mission
state. Review an explicit export/migration design before treating a campaign
backup as an all-data backup. Candidate saves containing the four new searched
container IDs should be kept with the candidate; automatic downgrade to public
v11 is not implemented. Existing v11 backups import into the candidate.

Cloud testing uses Linux Chromium/SwiftShader. No physical iPhone, iPad, Mac or
Safari pass is claimed. GPU memory is an estimate: four atlas source URLs do not
prove four runtime texture allocations, because GLTFLoader parsers can duplicate
Texture/image objects. Preserve that distinction in performance reporting.

Next: review the passing candidate/artifact with physical-device profiling and
the eastern/military/bog district work in the execution note. Use PR#83 and its
exact dependency on PR#81 for the parallel editor integration. Review the actual
combined result; do not merge or publish without approval of this candidate.

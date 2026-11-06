# Editor v2 integration requests — 6 November 2026

Track B baseline: main `be64a7f`. PR #81 `feat/moved-building-preview` remains
unmerged at initial audit. No uncommitted Track A work is assumed available.
These are review requests, not accepted canonical schemas or runtime capabilities.

## IR-01: editor module packaging / offline release (blocking merge/release)

Consumer: the existing `/editor/` and `/editor/world.html` plus new loot/mission
workspaces. New editor modules are imported by the existing entry points. The
canonical `tools/build.py` copies only `site/precache.json` entries. Track A owns
that manifest, worker version, bootstrap runtime revision and deployment.

Producer requested: add every new editor file listed in
`docs/verification-editor-v2/editor-runtime-files.txt` to the existing manifest,
review the additive editor imports, and choose a coordinated cache/bootstrap bump.
Do not change campaign or draft keys. Until accepted, build verification uses
`python3 tools/editor_v2_review.py`: the canonical build followed by an explicit
editor-only review overlay. This is not a shipping/release build and is not wired
to Pages. The normal build alone lacks the new modules and must not be published
with this branch's entry points. A merge must include accepted packaging first.

Acceptance: canonical build includes all listed files; existing/new editor browser
tests pass from dist and `/bunker-game/`; real prior service worker upgrades and
all workspaces restart offline, preserving normal/preview saves and drafts.

## IR-02: shared world geometry and complete buildings

Consumers: terrain/material brushes, bridges, underground/local scenes, focused
and in-world connected interiors, complete building templates and groups.
Current v1 layout and world v2 have fixed building IDs/footprints, coarse 12 m grid,
no material masks, bridge spans, local-scene registry or new-building bindings.
No competing format is introduced here.

Requested reviewed, versioned additions: explicit building instance/local-scene
identity and child/reference policy, terrain material/resolution contract, bridge
span deck/support/collider definitions, water depth/overlap/dry exclusions, and
accepted component definitions for APR/protection/discovery, fuse, siren, surge,
pod/save/sleep/station and coupled lighting/audio/fixtures. Example intent:
`{buildingId:'hut', objectId:'entrance'}` remains a reference, never a mesh UUID.
Validate all cross-scene IDs, finite metres, unique instances, source revisions and
migration of old drafts. No speculative field in these requests executes in game.

Acceptance: compiler returns visuals/collisions/interactions from one definition;
move/rotate/raise composes once; actual walks through both floors, saved round-trip,
dry refuge, linked missions/containers, preview isolation and old saves pass.

## IR-03: loot proposal adapter (E5 runtime dependency)

Consumer: `/editor/loot.html`; portable editor-only proposals retain actual
container/item IDs, named reusable defaults and explicit per-container overrides.
`panels/loot-core.js` is a deterministic authoring simulator, NOT a gameplay loot
engine and is not imported by runtime. The legacy game's independent-roll loot
is not relabelled or overwritten. Producer: accept a canonical weighted-table
contract and capacity/mission-guarantee policy, then implement/reuse one runtime
engine and make editor simulation call its pure API. See exported editor proposal
for concrete draw/item/quantity/repeat payload. Unknown capacity is reported;
no guarantee/preallocation or reward-overflow policy is invented.

Acceptance: same seeded vectors match runtime and editor; draws versus stack
units are explicit; no-repeat depletion/minimum failure validated; containers roll
once per world cycle and survive reload; mission-critical items never depend on
weights; legacy saves and old content migrate explicitly.

## IR-04: mission graph proposal adapter (E6 runtime dependency)

Consumer: `/editor/missions.html`, editor-only declarative proposals derived from
actual world mission/source/container IDs. Current game missions remain unchanged.
Producer: versioned graph contract and supported runtime action registry, typed
ports, prerequisite references, timer units, failure/retry/death/abandon policies,
reward delivery/idempotence and stable world-reference resolver. No graph evaluator
is implemented in this editor task. Unsupported objectives/components stay disabled.

Acceptance: collect/deliver/reach/interact execute against real objects after
building movement; persisted candidate selection and deadlines; failure/retry and
all/any joins; rewards once across duplicate events/reload; preview-only test events
never touch normal campaign/settings/journal. Escort/surge/sleep cannot be marked
supported until their runtime adapters and tests exist.

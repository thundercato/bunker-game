# Editor v2 integration contracts — current continuation

The continuation began on main `be64a7f`. During execution PR83 was merged through
PR81, and the approved Field Signal 11.1 release reached main. Editor merge
checkpoint `8cd2b24` incorporates accepted main `0aacdb4` without replacing newer
editor work. PR82 remains a separate editor review; it has not been merged or
published. No other task's uncommitted files are assumed available.

See `EDITOR_V2_CONTRACT_AUDIT.md`, `EDITOR_V2_PROGRESS.md` and
`EDITOR_V2_RUNTIME_COMPATIBILITY.md` for current interfaces, current acceptance and
historical detached compatibility evidence respectively.

## IR-01 — RESOLVED in canonical packaging (final CI in progress record)

The user explicitly authorised this narrow ownership exception. `precache.json`
explicitly includes the editor suite and accepted runtime resources; normal
`tools/build.py` produces **597 explicit files / 595 cache resources**, without an
overlay. The original 17-file omission was reproduced before integration. The
current enumeration and dependencies are in
`verification-editor-v2/editor-runtime-files.txt` and `editor-package-report.json`.
`tools/validate_editor_package.py` checks module imports/exports, workspace
bootstrap targets, HTML/CSS resources and literal data fetches; it rejects
private/credential/test paths and escaping symlinks. Tests and build-only Shapely
are excluded from the public bundle.

Suite/bootstrap/SW expectations agree on `field-signal-11.1-editor2.1.2`. The merge
retains accepted runtime startup helpers and network-fresh entry routes. Three
prior-worker fixtures cover world2, the early editor2.1 review cache and the
released 11.1 cache. Acceptance exercises upgrade before editor imports, all five
packaged workspaces under `/bunker-game/`, explicit offline preparation, offline
restart and byte-identical campaign/settings/journal/draft sentinels. No storage
clearing is used. Exact results belong to the current progress/CI record, not an
older cache run.

Normal CI includes every editor pure/browser suite, all three worker variants and
the accepted game regressions. A successful PR run retains canonical dist as an
ordinary review artifact. PR workflows do not deploy. Future runtime integration
must preserve both accepted runtime and current editor public entries; whole-file
replacement from an older branch is not an integration strategy.

## IR-02 — RESOLVED code dependency for bounded existing-building preview

The authoritative envelope remains `field-signal-world-document/1`. The editor's
session wrapper adds UI/history metadata around that envelope, not another world
schema. Existing world2/layout1 drafts are adopted without primary writes on load;
concurrent/rejected bytes and failed mirror writes have recoverable paths.

In-world and focused views edit the same layout. `compileBuilding` supplies one
parent transform; `LayoutScene` children remain local. The accepted main runtime
now bundles `world-preview`, `preview-document`, `layout-preview`, `world-layout`,
engine/terrain transforms and the shared binding/stair fixes. The launcher consumes
`compilePreviewWorld(document, buildingId, context)` and
`{format:'field-signal-preview/1',buildingId,document}` in a fresh isolated namespace.
Trusted source metadata now declares `worldPreview:true`. This applies one existing
building, subject to the runtime's bounds/overlap/foundation limits; it does not
publish edits to the normal campaign or compile the complete world draft.

`editor/source-adapter.js` consumes `loadCampaignSource`, `previewContext` and the
runtime's `loadAssetIds`. The base source is checked against shipped
`world-source.json` identity and SHA-256. All workspaces share the accepted 143
container source and complete asset registry. Missing interiors start from actual
campaign layouts (Forester has 52 objects), while explicit prior/recovered drafts
remain authoritative. Missing districts are adopted in memory; existing district
edits and hidden layers survive. **Nine pure integration checks passed**, including
old-draft preservation, source-byte/metadata rejection and explicit-save-only
adoption. No new-building IDs or copied quest bindings are introduced.

The earlier detached combination passed 38 actual-browser assertions for hut,
forester and station. That result remains historical evidence pinned to `edffe7b`
and recorded editor hashes. A fresh canonical three-building journey is being
verified after this merge; its result is recorded in progress/CI and must not be
inferred from the older compatibility run.

The accepted runtime extends stair sampling to 0.25 m past the top and handles the
floor slab lip. Rotated floor openings still use conservative AABBs. Editor landing
generation rejects clipped floors; arbitrary newly authored/rotated stairs and
landings still require headroom and actual top/bottom traversal checks. No second
editor-only walking algorithm substitutes for the shared runtime.

## IR-03 — weighted loot runtime API still absent

The accepted 11.1 runtime contains no weighted runtime generator. Editor
proposal `field-signal-editor-loot-proposal/1` retains real container/item IDs,
reusable defaults and overrides. It is not imported by gameplay. The simulator
remains an authoring tool; legacy independent-roll profiles and guaranteed mission
contents remain unchanged.

Requested shared pure API: one versioned bounded draw implementation with
`minDraws`, `maxDraws`, item-relative weights, units min/max and per-item repeat
permission. The editor should call that API, then compare identical seeded test
vectors with the worker/runtime. Runtime producer owns roll-once/per-world-cycle
persistence and old-save migration. Reject missing IDs, impossible minima and
forbidden duplicates; report depletion rather than manufacture repeats.

Mission guarantees/preallocation draw-budget treatment and actual capacity/overflow
rules remain unresolved. Do not treat optional proposal simulation limits as
known game capacities or invent a guarantee policy. Acceptance includes seeded
parity, protected mission items, reload consistency and old loot/save behaviour.

## IR-04 — graph runtime/action registry still absent

The accepted 11.1 runtime has legacy missions and a physical journal, not a graph
evaluator or accepted graph schema. This editor's declarative graph proposals do
not execute. Existing collect/recover/deliver game actions are not relabelled as
support for arbitrary authored graphs. Source/container links resolve real stable
IDs; their bindings survive parent placement through the compiler.

Producer requested: versioned typed graph/action registry and narrow adapters for
collect, deliver, reach and interact. Explicit voluntary offer/acceptance, all/any
joins, failure/retry/death/abandonment, owned delivery and once-only rewards must
have one runtime owner. Candidate-location choice and timed deadlines must persist;
clock units and reset/overflow policies require actual decisions/interfaces.

Acceptance: real world objects after move/rotation, seeded persisted choice,
reload during objectives/timers, branch/retry/death examples, rewards exactly once
across repeated events, no prerequisite softlocks, isolated event simulation, and
normal campaign/settings/journal unchanged. Unsupported mechanics remain disabled.

## IR-05 — actual refuge/local-scene and gameplay components

Current accepted source provides five base rooms, service stations, container and
portals, plus eight district sets with stable scenery/service entities. The editor
can inspect/link those actual references. The accepted runtime still has no
lossless editable local-scene contract
for the rendered refuge's pipes, lights, corridors and coupled service colliders.
A read-only source map deliberately does not pretend to be editable base geometry.

Requested producer: stable scene/entity IDs and lossless import of current rooms,
fixtures, stations, transitions and interactive anchors. A local-scene transform
must move renderer/collider/service interaction together; distinguish its source
frame from exterior coordinates without migrating existing IDs by accident.
Procedural instances need stable IDs or explicit locked-reference status before
replacement. Preserve trader/canteen/radio/vault/stair functions and layout.

APR/protection/discovery, lever/fuse, siren/surge, reward zone, pod/save/sleep and
linked light/audio components also have no accepted definitions or runtime adapters.
Request a versioned supported-component registry with references, units, validation
and declared preview capability. No unused switches/JSON fields are enabled here.
Global water must have explicit local-scene dry exclusions before any flooding rule.

## IR-06 — material/support/prefab extensions

Canonical material choices work; authored UV tiling/orientation does not exist.
Request validated per-object UV scale/orientation/tint semantics, bounds and a
renderer implementation that does not mutate a shared material globally. Real
support snapping currently uses authored floor pieces and solid prop top faces,
including shared stair holes; a mesh shelf/support-face registry needs producer
geometry metadata. No decorative mesh is assumed to be a loot container.

Templates currently expand unbound concrete children with fresh IDs and explicit
scale/material overrides; they cannot copy quest bindings/doors/spawn. Linked
prefab instance identity/update policies and full building cloning remain absent.
Request explicit retained/remapped/omitted binding policy before allowing them.

## IR-07 — terrain/path/water physics and format evolution

Current brushes use existing concrete foliage IDs/transforms; dirty updates and
exclusion previews work without changing the 12 m world2 height format. Material
blend masks/finer cells require a versioned backward-compatible sampling/migration
contract. Foundations still use existing centre sampling/offset/manual locks;
footprint cut/fill ordering must be agreed to avoid feedback with terrain-fit paths.

Bridges need explicit endpoints, deck/support definitions and shared physical
surfaces. Water needs stable local volume IDs/boundaries/depth/classification,
overlap precedence and dry-scene exclusions. Existing visual circles/global level
are authoring proxies; no drowning or walkable bridge is claimed. Acceptance is
saved terrain/road/rail/bridge/water geometry agreeing with collisions, grounded
locked objects and mission access in isolated game preview, with measured budgets.

### Accepted runtime changes and remaining boundary

PR83's final inspected candidate `e31b72a` was subsequently merged through PR81;
the accepted 11.1 runtime is now in this branch via main `0aacdb4`. Its generated
fixed campaign road polygons and renderer/sampling inputs
(`field-signal-campaign-road-surfaces/1`) are retained. The development-only Shapely
generator stays outside the public package. These fixed routes are distinct from
an editor world2-draft road adapter, which remains absent.

Optional `binding.floor` / `binding.anchor`, `roofRise`, shared stair-transition
fixes and bounded same-floor save clearance are accepted runtime interfaces now.
They do not supply weighted-loot, graph, APR/sleep or complete editable-refuge
contracts. Historical detached compatibility evidence remains pinned to `edffe7b`
and its recorded editor hashes. Current canonical acceptance belongs to the merged
checkpoint and is recorded separately in the progress/testing documents and CI.

# Editor v2 shared-contract audit — 6 November 2026

Current editor merge checkpoint: `8cd2b24`, incorporating accepted main `0aacdb4`.
PR83 was merged through PR81 and the approved Field Signal 11.1 runtime is now
available in this checkout. PR82 remains an unpublished editor review. The earlier
main `be64a7f` / detached PR83 `edffe7b` audit is historical; its exact compatibility
results remain in `EDITOR_V2_RUNTIME_COMPATIBILITY.md`. Other tasks' uncommitted
files are not assumed visible.

## Accepted interfaces consumed by the editor

- The authoritative envelope remains `field-signal-world-document/1`, containing
  world authoring v2 and interior layout v1. Stable building, child and gameplay
  binding IDs remain authoritative. No competing component schema is introduced.
- `compileBuilding(document, buildingId, context)` resolves one building's parent
  transform, local layout, world geometry/colliders, interactions, mission targets
  and spawn. Child coordinates are local, Y up, metres/radians; the parent composes
  once. `layout.origin` is provenance, not a second placement transform.
- Accepted `compilePreviewWorld` and runtime adapters now support isolated
  existing-building preview. The editor enables this through trusted capability
  metadata, compiles before launch and creates a fresh preview UUID. Runtime
  placement bounds and collision/foundation restrictions still apply. Ordinary
  campaign/settings/journal state remains separate; preview is not publication.
- `editor/source-adapter.js` uses the accepted `loadCampaignSource`, `previewContext`
  source-digest check and `loadAssetIds` registry. The reviewed base source identity
  remains `6b4f9fb9401398a65eee576f40b2d80805ef6c76`; the loader adds current accepted
  campaign content. Imported JSON cannot select a source revision or asset URL.
- All five workspaces consume the effective **143-container source**, retaining
  the 139 original IDs plus four reviewed district bindings. Four actual campaign
  interiors are available. An absent Forester interior opens the complete 52-object
  authored layout; existing/recovered user drafts take precedence. Nine pure source
  integration checks cover this, old-draft compatibility, complete registry,
  rejected source bytes/metadata and storage-safe district adoption.
- Existing container/loose `binding`, `doorId`, mission IDs and mission source station
  references remain real interaction identities. Accepted optional `binding.floor`
  and `binding.anchor` separate a wall-mounted visual from its search floor/anchor.
  Optional `roofRise` retains a sealed ceiling rather than inventing a usable loft.
- Shared stair-top sampling/floor-lip fixes are now bundled. Conservative rotated
  opening AABBs and arbitrary newly authored landing traversal remain limits to
  validate, not reasons to add a second editor collision implementation.

The earlier detached three-building run passed 38 assertions at its recorded
revision. Fresh merged canonical acceptance is a separate run; consult the current
progress and CI evidence rather than treating that historical pass as a new result.

## Released campaign content and its limits

The retained `field-signal-districts/1` source contains eight scene sets and 95 stable
entities, including 13 refuge services. District overview transforms remain saved
authoring proxies; the normal runtime does not consume edited district drafts.
Missing district data is adopted from the accepted source in memory, and storage
changes only on explicit save. Existing authored district transforms and hidden
layer settings remain intact.

The actual underground refuge still has five source rooms, existing stations, two
base-origin portals and `base_locker`. Source references and linked offers are
inspectable without moving a visible station independently of its interaction.
The district service identities do not provide a lossless editable local-scene
contract for all refuge corridors, pipes, lights and transitions.

Accepted fixed campaign road polygons have renderer/sampling data and a
build-only generator. This does not compile edited world2 roads/rail/terrain/water
into gameplay. The full-map draft remains distinct from the playable campaign.

## Producer contracts still absent

| Capability | Shared contract still required | Safe editor capability now |
| --- | --- | --- |
| Editable refuge | Lossless local scene import, render/collision/service transforms, pipe/light instances and migration | Inspect actual rooms/services/storage/transitions and linked offers |
| Weighted loot gameplay | Canonical weighted API, seeded draws, persistence, mission guarantees and capacity/overflow policy | Proposal validation/simulation and actual container links |
| Mission graph execution | Typed evaluator/action registry, persisted random choices/deadlines, retry/death/abandon policies and reward idempotence | Typed proposals, real source/target links and validation |
| APR/protection/discovery, fuse/lever, siren/surge, pod/save/sleep | Versioned components, geometry/reference resolver and event/save handlers | Unsupported status and actual references; no unused gameplay switch |
| Edited terrain/path/water physics | Resolution/material/foundation/bridge/water/dry-exclusion contracts consumed by runtime | Reversible authoring brushes, masks and diagnostics |
| UV/support/prefab extensions | Per-object UV semantics, mesh support faces, instance update/remapped-binding policy | Existing material choices, authored top-face snapping and concrete unbound templates |

No weighted-loot evaluator, mission graph evaluator or new APR/surge/pod/checkpoint/
fatigue/drowning authoring implementation was supplied by the accepted runtime.
Existing collect/return missions and station interactions are not execution of
edited graphs. See IR-03 through IR-07 in `EDITOR_V2_INTEGRATION_REQUESTS.md` for
precise producer requests. IR-01 packaging and IR-02's bounded building adapter are
integrated; those later shared mechanics remain separate work.

## Packaging reconciliation

The canonical build contains **597 explicit files / 595 cache resources** using
`field-signal-11.1-editor2.1.2`. The allow-list/import closure retains runtime and
editor resources without shipping tests, private files or build-only dependencies.
CI exercises world2, editor2.1 and released11.1 prior-worker fixtures and all five
workspaces. Exact fresh pass/failure results belong to the progress/testing record
and current PR checks. This editor branch has not merged or deployed its suite.

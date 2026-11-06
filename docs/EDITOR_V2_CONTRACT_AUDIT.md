# Editor v2 shared-contract audit — 6 November 2026

This is a compatibility snapshot, not approval or publication of either draft PR.
The editor continuation inspected main `be64a7fc17b6c8054a757c9e713739161a103436`,
PR #81 `476441ee2def32752031c20124c6bbdc2077a14c`, and its successor PR #83
`edffe7b118961406a6516ac079f706375a725ab8` on
`feat/game-first-candidate`. Other tasks' uncommitted files are unavailable.

## Available interfaces

- The authoritative envelope remains `field-signal-world-document/1`, containing
  existing world authoring v2 and existing interior layout v1. Stable building,
  object and gameplay binding IDs remain authoritative. No editor component
  schema is added by this continuation.
- `compileBuilding(document, buildingId, context)` returns one building's resolved
  parent transform, local layout, world objects/colliders/interactions,
  container-bound mission targets and spawn. It already handles an existing
  building generally; the runtime branch's old moved-preview UI is hut-bounded. The underlying
  adapter is generic; the editor continuation subsequently proved hut, forester
  and station in its detached compatibility artifact (see the runtime record).
  This does not bundle or approve that adapter in PR82.
- Child coordinates are local, Y up, metres/radians; parent position/yaw composes
  once. `layout.origin` remains provenance. Compiler results must not be passed
  back as local authored child positions.
- Existing `source.containers`, `source.looseSlots`, object `binding` and `doorId`
  provide real interaction identities. Existing `source.missions` refer to stable
  containers and `missionSources`; the latter resolve to actual `stations`.
- The actual underground refuge is visible in `zones.base`, five `rooms`, existing
  `stations`, two base-origin `portals` and `base_locker`. A read-only reference
  adapter can inspect these without moving a visible station independently of its
  interaction. This is useful source navigation, not refuge authoring.

## Candidate additions and their limits

PR #83 adds a `field-signal-districts/1` source with eight district scene
sets and 95 stable entities, including 13 refuge services. These are authored
candidate game content. Its full-map district transform fields remain authoring
proxies; they do not establish an editable underground local-scene contract.

The candidate includes four authored homes and four additional search bindings
(143 effective containers while retaining the 139 original IDs). Loading those
source additions requires the reviewed candidate source/context; the editor must
not invent their IDs or copy the candidate gameplay implementation into its own
schema. Compatibility results must name the exact candidate SHA.

## Dependencies still absent

| Capability | Producer contract still required | Safe editor work now |
| --- | --- | --- |
| Editable refuge | Local scene registry, source identity, shared render/collision/interaction transforms, pipe/light instances and migration | Inspect actual source rooms, stations, storage and transitions; expose linked offers |
| Weighted loot in gameplay | Canonical weighted table API, seeded draw contract, capacity/overflow and mission guarantee policy | Existing proposal validation/simulation and actual container links |
| Mission graph execution | Versioned graph evaluator/action registry, persisted deadlines/random choices, retry/death/abandon policies and reward idempotence | Existing typed proposals, source/target links and graph validation |
| APR/protection/discovery, fuse/lever, siren/surge, pod/save/sleep | Versioned component definitions, geometry/reference resolver, event/save policies and actual runtime handlers | Visible unsupported status and actual existing references; no gameplay switch |
| Terrain/path/water physics | Resolution/material/bridge/water/dry-exclusion contracts consumed by runtime | Reversible authoring brushes and diagnostic proposals |

No weighted-loot evaluator, mission graph evaluator, or APR/surge/pod/checkpoint/
fatigue/drowning implementation was found in the inspected PR #83. Its progress
document explicitly lists these as remaining work. Existing collect/return
missions and station interactions must not be relabelled as execution of edited
mission graphs.

The current smallest shared requests remain IR-02, IR-03 and IR-04 in
`EDITOR_V2_INTEGRATION_REQUESTS.md`. A new field in editor JSON does not satisfy
these dependencies. The bindings panel therefore exposes read-only source
references, actionable invalid-reference diagnostics and stable authoring links.

## Final observed successor

A final fetch observed PR83 `e31b72a8ff4096dfd94d74297d190af4426b62dd`. Its added
fixed-road polygon compilation and renderer/sampling data were inspected; they do
not compile editable world2 draft paths into gameplay. Its new design notes document
existing optional binding floor/anchor and roofRise, plus bounded same-floor save
clearance. None supplies weighted-loot/graph or refuge-component authoring APIs.
The recorded three-building compatibility run is deliberately still attributed to
`edffe7b` and exact copied-editor hashes. Neither runtime PR has been merged here.

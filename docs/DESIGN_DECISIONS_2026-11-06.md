# Field Signal design decisions and open questions

Owner: Adam. Consolidated from the Field Signal design discussion, 6 November 2026. These are product requirements and planning notes, NOT a list of implemented features. `CODEX_HANDOFF.md` and the code describe what actually exists. Later explicit user decisions take precedence over earlier assistant suggestions. Proposals and unresolved details are labelled below.

## 1. Product, platform and priorities

Approved direction: a gritty, atmospheric first-person survival game, usable from an iPhone/iPad browser/Home Screen; a desktop-first editor for Mac mouse/keyboard, also usable on other desktop systems. No requirement for ray tracing. Better layouts, art coherence, performance and portability matter more than simply adding large models. Keep the base soundtrack calmer than the field. A native app is a possible later evaluation, not an approved rewrite.

The editor comes first because correcting layouts through coordinates and hard-coded geometry has become unreliable. It should edit the real scene definition consumed by the game. No normal gameplay page scrolling. Complex settings need clear names, tooltips/descriptions and meaningful validation. Separate draft/test/validate/approve/release stages; no automatic live publication whenever an object moves.

## 2. Full-map and building editor

Confirmed selections:
- Sculpting beneath a building automatically adjusts the building height to follow the ground.
- Painted objects follow ground height, with individually locked objects/manual overrides.
- Roads and railways are editable curved paths, with terrain fitting and bridges.
- Organise the map into regions, editable layers and visibility/lock controls.
- Automatic terrain adjustments around structures and paths, with manual overrides.
- Water option C: global automatic water level plus explicitly editable water volumes.
- Earlier acceptance of the recommended building workflow covers BOTH in-place cutaway editing and double-clicking into a focused workspace. Do not treat the later repeated question as revoking that approval.

A building is one entity. Its exterior, floors, stairs, furniture, pipes, cables, doors, lights, containers, loose-loot surfaces, mission anchors, reward markers and triggers move/rotate with it. Store children in local coordinates. Moving a building must not strand an invisible collider, loot interaction or mission marker at the old position. Instance copies must receive valid unique IDs and intentional mission bindings.

The player-facing problem to solve is mismatched exteriors/interiors, incorrect staircase/floor openings, gaps in walls and props in nonsensical locations. Imported exterior shells are not automatically walkable houses. Align door/window openings, floor/storey heights and collision deliberately.

One-sided resizing is required. Drag a floor/wall edge so that the opposite edge stays fixed, instead of scaling outwards from its centre. Retain precise dimensions, snapping, rotation, undo/redo and locking. Implement in the object's local frame so rotated structures behave sensibly. Add edge/corner handles and a clear anchor/pivot indication. This is not the same as multiplying centre-based scale.

The underground refuge, corridors, pipes, lights and incubation room must ultimately be editable too. The existing v1 editor does not cover them. New buildings and reusable complete templates were accepted in the broader editor recommendations, but must be added safely rather than bypassing current fixed-origin/schema constraints.

## 3. Terrain, foliage, roads and water

Approved terrain tools: raise, lower, smooth, flatten, brush size/strength, undo. Paint grass, bushes/trees, rocks and other dressing with seeded natural variation in size, rotation and spacing; allow subsequent individual editing. Terrain texture/material painting and better blending are intended editor improvements.

Approved water gameplay: shallow water slows movement; deeper water increases difficulty and can cause drowning. No swimming for now. The world editor should support creating depressions and ponds as well as deliberate rivers/swamps.

Engineering proposals, not completed work:
- A stable, upright foundation reference for each building, with a visible cut/fill/flatten policy and manual height lock. Do not tilt a whole house to a single sampled terrain normal or silently move child furniture relative to its floor.
- Preserve authored scatter positions between reloads. Changing density should use an explicit operation with predictable seeds, undo and protection for locked instances, not reroll the entire forest during every frame or brush edit.
- Local higher-resolution terrain near structures rather than assuming the current 12 m prototype grid is sufficient for stairs, banks or ditches.
- Roads/rails need mesh and collision generation, shoulder blending, slope limits and explicit bridge spans. Do not silently invent automatic tunnels as already-delivered scope.
- Distinguish water surface, underlying bed, swamp drag and gameplay volumes. Protect underground interior spaces from accidental global water-table flooding. Define override precedence and bounds.

Unresolved when implementation reaches them: water volume shapes/overlap precedence and currents; exact drowning rates and recovery; terrain/road foundation ordering; density-regeneration semantics; movable building footprint changes and new-building mission links; full prefab update-versus-instance-override workflow.

## 4. Loot generation and management

Confirmed replacement for independent per-item rolls:
1. Choose a bounded number of selections for a container, using its minimum/maximum.
2. Select eligible items by relative weight.
3. Each item has a duplicate permission, not only a global table setting. Bandages may repeat; a rare firearm can be restricted to one selection.
4. Quantity/stack controls are separate from selection count. Explain clearly whether a setting means draws, distinct item types or individual units.
5. Provide per-container editing AND a master view grouped by region/building/searchable object. Include search, drill-down and reusable defaults with explicit overrides.

Weights are relative selection likelihoods, not independent percentages or a literal overall inclusion chance. For example, weight 50 versus 5 means ten times the relative likelihood on a draw when both are eligible. Removing nonrepeatable entries changes later draw probabilities. Display derived probabilities accurately and distinguish first-draw probability from chance of appearing anywhere in the result.

Important correction: the earlier '100% means guaranteed' discussion applied to independent probability rolls. A weight of 100 does NOT guarantee selection in a weighted pool. The final guarantee/preallocation UI was not settled. Mission-critical item placement is a separate mission requirement and must not depend accidentally on a rare random roll. Ask before adding a new guarantee mechanism or deciding whether such items consume the container's draw budget.

Proposed safe edge-case handling: stop or warn when a table cannot satisfy its minimum without violating duplicate limits; never silently create forbidden duplicates. Test empty pools, zero weights, no-repeat depletion, quantities, capacities and overrides. Preserve seeded reproducibility; roll a container once per relevant world cycle, not every time its UI opens. Completed searches should not reroll on page reload.

## 5. Missions and flowcharts

Confirmed structure: an editable visual graph with events, objectives, conditions, actions and outcomes. The graph must link to actual world objects. A Missions tab exposes title, description, artwork, source, target, rewards and logic. Selecting a radio or NPC should reveal its associated offers/missions. Use stable IDs, not coordinates, as references.

Collection variations explicitly requested:
- A special object at one fixed location.
- A special object whose location is chosen from several candidates when the mission becomes active, with hints showing possible locations.
- Ordinary items collected anywhere, such as two toilet rolls and a toothbrush.
- Delivery of an object supplied by the mission-giver to a specified person/place.
Every delivery-style mission needs an explicit destination and completion action.

Approved mission vocabulary includes investigate/discover/reach, interact/repair/activate/deactivate, rescue/escort, eliminate/clear, defend/protect, survive/wait, stealth/infiltration, craft/build, communicate, track and timed objectives. These are desired capabilities. Many underlying gameplay mechanics, such as escort AI, have not been implemented. A graph node must not be marked supported merely because it can be drawn.

Confirmed acceptance/progression:
- Missions are ALWAYS offered for the player to accept. Never automatically assign them when unlocked. The player may explore with no active mission.
- Mission-givers have their own offer/progression rules. The radio may initially offer one mission, then three, with all three completions required before the next stage.
- Completing a mission or stage can unlock a new radio stage AND a side chain from a different NPC.
- Support simultaneous objectives/missions and grouped dependencies where required by the authored graph. Distinguish 'all required' from 'any one' joins.
- Prerequisites can include other missions, discovered locations, owned items and relationships/trust. These last systems need real implementation, not just labels.
- Main/side classification is distinct from exclusivity. Exact exclusivity scope is still a design detail, not permission to cancel unrelated accepted missions.
- Abandoning a mission invokes its failure logic. Do not add a hidden special 'abandon without consequences' default.
- Failure is configurable per mission: retryable, permanent or an alternative branch. Timed missions use the same rule. A required stage must not become an unwinnable accidental softlock after failure.

Player-death behaviour must be an explicit, clearly explained per-mission setting: continue with progress retained (possibly recovering dropped mission items), restart objectives/items, or fail through that mission's configured failure branch. Examples show why collecting a document need not require repeating every earlier objective after dying on the journey back. Do not implement death policy and item-respawn policy as contradictory independent switches.

Timers need a defined start event, clock domain, pause/abandon/death/retry semantics and persisted deadlines. Randomly chosen mission locations need to be persisted, not rerolled on UI refresh. Graph validation should flag missing IDs, invalid branches, unreachable completion, unbounded cycles and softlocks. Imported graphs must be declarative, not arbitrary JavaScript/Python execution.

## 6. Rewards

Confirmed: money and one or more inventory items; delivery can be a physical placement at a named location or into a storage container. An invisible reward marker/zone belongs to its parent room/building and follows it. Several missions may use the same zone. Before completion there is no reward object there.

Money/reward creation is once per successful completion/attempt as designed; reloads, duplicate events or area re-entry must not duplicate rewards. Rewards persist when the player leaves and returns. The editor should select items from the actual catalogue, not invented unsupported item IDs.

Overlapping physical rewards are a known concern. Slot/placement zones and capacity checks were discussed, but detailed overflow rules were explicitly deferred by Adam. Container capacity does not solve overflow by itself. Do not silently destroy an earned item or assume infinite storage; a persistent pending-reward record is an engineering proposal to avoid loss while the delivery policy remains unsettled.

## 7. Anomaly surge cycle

Confirmed distinction: this is a major world reset, not the current small anomaly hazard fields.

Warning sequence: the sky darkens and shows strange horizontal/static-like electrical activity, not ordinary bolts to the ground. Approximately 4-5 minutes of atmospheric warning were discussed, then about 2 minutes of spatial siren warning, followed by inversion/negative-like visuals, strange flashes and a final whiteout. Timings are provisional and configurable. Real-time versus in-game-minute units, and exact overlap, were NOT finally resolved.

Use actual siren props spread through the level, with volume/direction based on distance. At a safe station, flickering lights, a brief blackout, red emergency lighting, vibration/shudder, falling dust and a reboot sound convey the event. Normal lighting returns afterwards. The actual event does not jump the clock or refill hunger, thirst, health or rest. A person safely indoors remains there with their state intact.

The split-flap display is a danger-window indicator, not a reliable exact-surge countdown. Proposed cycle bounds are 22 to 44 IN-GAME hours. After a surge it counts down the safe period; at zero it turns red and displays negative elapsed danger-window time. It does not reveal the actual sampled event time. The numbers were examples, so keep them configurable. Increasing hazard probability over time was an assistant suggestion, not a confirmed distribution. Preserve sufficient environmental warning before the final cutoff.

Reset intent: ordinary field loot/enemies reset and equipment/death remains left outside powered protection is erased. If caught outside at the final flash, the player loses carried equipment and reappears at base with no recoverable remains from that surge. This overrides the earlier assistant suggestion that dropped gear would always be surge-proof.

The user later specified that active missions reset during a surge even when the player is safely indoors. Do not substitute ordinary player-death rules for surge rules. Exact acceptance state after reset, handling carried/stored mission-critical objects, completed-story milestones and permanent unlocks still need clarification. Do not erase completed reward history or permanent discoveries by accident. Design a reset matrix explicitly rather than using 'reset everything' as a blanket database wipe.

Potential better loot or other danger-window incentives were ideas, not selected mechanics. Keep them in the suggested backlog.

## 8. APR stations and protection

APR means Anomaly Protection Relay. The main underground base and powered APR stations are safe zones, identified by a recognisable exterior emblem/sign. Stations can vary in size. APRs do not appear on the player's map until discovered; discovery then persists.

Every APR has a large industrial power lever. It must be powered to protect. Some start ready; some require a fuse; some can briefly start and reveal a faulty fuse as an authored scenario. Interact with the panel/fuse, then use the lever. Provide clear powered/offline/fault state and sound, not ambiguous safety.

Once repaired/activated, ordinary APRs remain working. No random fuse failure is approved now. Scripted missions may take a station offline. Example tutorial: APR-72 reports no communications/suspected blown fuse; collect a fuse, repair the station and restore protection. Later spontaneous failures are optional future work.

No artificial entry lockout before the final surge flash. Being inside a powered protection volume before that cutoff is enough. Do not delay actual safety until a long decorative boot animation completes without clear design approval.

Protected storage is intended to survive surges. Exact behaviour for property left at a station deliberately taken offline must be specified before implementing that event. Optional beds/storage/save chambers and locked underground passages link areas; codes, missions or other unlocks can open routes. Do not equate these with already-approved instant fast travel: walkable links and optional later shortcuts are the established idea.

## 9. Ordinary death, pods and recovery

Ordinary death leaves carried equipment at the death location for recovery until a surge erases it. Return to the main base in an incubation pod. The player emerges in pants and a vest, with basic clothes in a nearby issue drawer, but NO free gun or ammunition. The pod hall uses non-sequential/random-looking numbers, not a simple death counter. Cloning/shared memories/reconstruction are unresolved lore possibilities; do not lock in a named identity story.

Incubation/respawn pods are distinct from save-only cryo chambers. Whether gear is one recoverable backpack, a held weapon plus backpack, or scattered individually was not settled. Exact recovery-marker visibility and multiple simultaneous death sites also remain open.

## 10. Saving, quitting and safety

Approved target model:
- One rotating AUTOSAVE slot, plus a separate manual cryo save. Continue loads the newer committed save.
- Autosave on entry into the main base or a powered APR.
- On base departure, save a canonical position at the bottom of the stairs facing upwards towards the exit, before the halfway-up exterior transition. Do not save the player halfway through a door/fade/loading operation.
- Death commits the POST-death state immediately: the replacement player in the main-base incubation pod, plus dropped items or surge losses as appropriate. It overwrites the previous autosave.
- Upright cryo chambers in the personal room and APRs are manual-save devices: enter, turn, press button, door seals, mist/frost and machinery, successful-save confirmation. They save only. No healing, hunger/thirst reset, fatigue reset or time skip.
- No ordinary saving outside protection, except the explicit death-to-base transition above.
- In-app quit warns how long ago and where the newest valid save occurred and that unsaved progress will be lost. No hidden outside suspend-save was chosen.

Clarifications: earlier 'save only manually' was superseded by entry/exit/death autosaves. Continuous autosaving every few seconds in a safe room was NOT settled; the user gave the cryo chamber a role in preserving shopping/cleaning/mission changes before quitting. Preserve the current live implementation until this replacement is built and migrated deliberately.

Older manual-save availability after death was an assistant anti-save-scumming suggestion, not a user-approved ban. Do not remove those saves or silently create ironman rules. APR departure pose/exit behaviour must be defined for its geometry rather than assuming every shelter has the main-base stairs.

Technical reality: mobile operating systems can terminate a tab without a custom quit dialogue. A browser cannot guarantee the warning for force-close, crash, eviction or shutdown. Show it in supported in-game flows and explain the last committed checkpoint. Transactional fallback data for corruption recovery is different from inventing an extra player-visible save slot.

The user's wish to leave a computer idle in a safe zone indefinitely conflicts with continuing hunger/thirst/fatigue unless those needs are nonlethal, paused or otherwise handled there. AFK survival and wall-clock/offline progression remain unresolved. Do not simulate a real-world year of starvation on reopening without approval.

## 11. Sleep, exhaustion and unconsciousness

Voluntary sleep only in safe zones. A rest meter is proposed with 100% fully rested, 0% exhausted. At zero the player collapses anywhere, even in a base/APR. Final warnings include simulated heavy eyelids, blur and yawns, discussed for the final ten minutes; the time unit must be clarified.

Forced sleep normally ends at 50% rest. Once at least 15% rest is recovered, disturbances such as sirens or rain can wake the player early. Anomaly events wake voluntary sleepers in safe zones to emergency lighting, shaking and dust; they may choose to sleep again afterwards. Reconcile this with the 15% forced-collapse threshold before coding it. Damage wake-up rules and recovery rate/bed quality are not settled.

Sleeping/unconscious players have no artificial immunity. An already-chasing creature continues attacking. Otherwise enemies retain ordinary perception/patrol behaviour and do not magically locate or hunt a sleeping player. Sleeping outside during a surge offers no protection.

## 12. Editor simulation and publication

Provide test controls for objectives, mission failure/retry, rewards, death, surge, power/fuses, discovery and safe-zone boundaries. These must operate in isolated preview state. Validation needs structural/collision checks, mission reachability, item/source validity, storage/reward safety and mobile render budgets.

Draft -> Test -> Validate -> Approve -> GitHub release is confirmed. GitHub history, portable JSON and rollback matter. A save button must not embed a GitHub token or directly mutate production. Direct authenticated proposals are a later implementation choice; export/review is the current safe path.

## 13. Remaining questions: ask only when needed

- Surge warning/clock units and probability distribution; exact active-mission reset matrix versus permanent progression.
- Weighted-table guarantee/preallocation and whether it counts towards draw capacity; duplicate units versus stack quantities.
- Reward overflow/capacity policy, deliberately deferred.
- Death loot packaging, multiple corpses, legacy manual-save access and invalid checkpoint relocation after edited maps.
- AFK needs/offline simulation, exact fatigue warning/recovery units, wake-up priority.
- Fully connected cave/sewer navigation versus optional fast travel, water exclusions and new-building/prefab authoring rules.
- Physical target-device performance measurements and the minimum supported device class.

Do not reopen already-approved broad choices. For nonblocking implementation details, state a conservative reversible default and keep it marked as a proposal.


## 14. Game-first candidate implementation notes

The latest explicit request prioritises actual playable map/interior/journal
improvements over further editor-only foundations. PR #83 implements a bounded
campaign candidate on the retained Three.js/Python engine; no production approval
or whole-v12 completion is implied. See MEGA_BUILD_PROGRESS for actual scope.

For compatibility with changed furniture, a blocked imported player position may
move to the nearest sampled clear point within4m on the same zone, authored house
footprint and physical floor. Valid positions and guarded crane endpoints remain
exact; health, loot and mission progress do not change. Failure preserves the
input and rejects the repair instead of choosing another storey. A visible event
records a successful clearance adjustment. This bounded candidate repair does not
settle the broader future checkpoint/death/save-system design.

Optional layout binding.floor and binding.anchor distinguish a wall-mounted
model from its physical search floor. Optional roofRise adds pitched exterior
geometry above a retained flat ceiling/collider without inventing a usable loft.
Old documents omit these optional fields and retain their previous behaviour.
These values are validated authored data, never executable imported scripts.

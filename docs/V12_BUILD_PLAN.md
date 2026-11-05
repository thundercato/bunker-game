# Field Signal v12: Blackout

Game-first update requested by Adam. World Editor v2 is deferred; preserve the shipped editor v1 and normal campaign migration.

## Binding gameplay decisions

- Surges have a guaranteed 22 in-game hour safe period and occur by 44 in-game hours. Black split-flap clock counts to the danger window, then red negative elapsed danger time. Environmental buildup, horizontal sky static, roughly five minutes then two minutes of spatial sirens. Smooth negative/whiteout effect with reduced-effects option. No time jump or free restoration of survival meters. Powered shelters flicker, black out, go red, shake/dust and reboot.
- Outside on the final flash: all unprotected loose gear and death packs erased, carried gear lost, wake in a new numbered incubation pod. Ordinary death: all carried gear is recoverable; no free replacement gun or ammunition. Basic clothing issue only. Stable stored property survives.
- APR stations have hidden-until-discovered map markers, industrial levers and fuse panels. Once successfully activated they stay active, except explicit scripted failures. Exact powered protection boundary at the final flash; no lockout. Locked underground connection points support mission unlocks.
- One autosave and a manual cryo save, load whichever is newer. Autosave on safe-zone entry, on departure at the inside stair/bottom marker facing out, and immediately after death at the pod. No periodic outside saves. Cryo saves only; no healing, hunger or fatigue restore. Quit screen shows last save location and elapsed play time. Handle mobile browser warning limitations honestly.
- Voluntary sleep only in powered safe zones. Fatigue collapses at zero. Last ten in-game minutes: eyelids, blur and yawns with comfort options. Forced sleep normally recovers to 50%; sirens/rain can wake at 15% recovered. Enemies retain ordinary perception, not magical sleep hunting. Interrupted safe-zone sleep wakes to surge effects.
- Weighted per-container loot: bounded number of draws, weights, stack min/max, per-item duplicate permission. Existing guaranteed/mission items protected. Grouped configuration and deterministic generation; new map-authoring UI waits for editor v2.
- Explicit mission acceptance only; sequential and grouped dependencies, side-giver chains, conditions, timers, failure/retry and abandonment-as-failure. Death policies per mission. Surge resets active expeditions, not completed story rewards. Money, durable claimable rewards and linked physical storage. Advanced reward overflow deferred.
- Game-side debugging and validation, discovery overlays and performance diagnostics. Destructive simulations must use isolated test campaigns.

## Delivery discipline

Develop on this branch, preserve main until tests pass, commit checkpoints, document actual delivered features and known limitations. Include old-save migration, safe boundary/clock/death/mission/loot tests and published-site verification. Do not claim native iOS/controller tests from headless desktop checks. No v2 editor changes in this release.

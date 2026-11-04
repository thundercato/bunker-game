# Field Signal roadmap

## Fieldcraft v10

Implemented and locally checked: 25 new imported model families; shared model-based loot previews; complete 61-item visual registry; interactive inspect view; paginated catalogue; full-screen zoomable atlas; objective/return-contact centring; quick current-mission controls; same-origin v9 save continuation.

Final GitHub CI and published-site results are recorded in `RELEASE_10.0.md` when they have actually completed. Physical iPhone/iPad/controller tests remain outstanding.

## Next priorities

1. Physical-device performance and controller feedback: capture actual model, iOS version, input report and frame-time behaviour. Optimise against measurements, not assumptions.
2. Broader route audits: verify every furnished room and stairwell, then improve enemy navigation around objects and multi-storey pursuit.
3. Remaining visual fidelity: exact item-specific shapes and labels, richer clothing and food props, animated cabinet/drawer opening, remaining kitchen pieces, vehicles and authored structural building shells.
4. Mission variety beyond fetch/recovery, richer encounter scripting, clearer threat feedback and economy balancing.
5. Refactor the layered renderer and UI into stable modules. Keep geometry and texture sharing, lazy item inspection and pure map maths covered by tests.
6. Improve save recovery UX and per-release fixtures. Cloud save would be a separate opt-in project.

## Honesty about this release

Not every object is a downloaded mesh. The 61 item definitions use 25 imported model assignments and 36 original geometry assignments, with appropriate reuse. More than one catalogue entry may use the same base model. Shacks and buildings retain authored collision/structural geometry with imported surface modules, frames and details. Existing containers have new visual furniture meshes; fully articulated imported cabinet doors are a follow-up, not claimed here.

The map is a navigation aid, not a safe-route planner. Hidden anomalies are not exposed. No hardware haptics/controller support is guaranteed merely because an automated API simulation passed.

## Development agreement

Keep main playable. Work on a feature branch; save source checkpoints and test evidence to GitHub. Do not call a local or queued deployment live. Update the README, player guide, credits and roadmap with the code. Never erase a user's save to disguise a migration problem.

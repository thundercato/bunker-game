# Fieldcraft v10 verification

## Passed before publication

- 77 Python tests, including existing gameplay/save rules and ten new model/thumbnail/manifest checks.
- 15 existing JavaScript input/audio tests and 18 new pure atlas tests.
- 35 Fieldcraft real-browser scenarios, including live 3D inspection, actual pointer drag and two-finger pinch events, current-mission navigation, recovery routing, real looting and doorway collision checks.
- 15 browser regression checks under the exact `/bunker-game/` path, including the Python worker, sparse controller-input simulation, calmer base soundtrack, old save import and full offline reload.
- Seven additional Linux WebKit checks: engine/assets, simulated controller camera movement, inventory previews, inspector rendering/zoom, atlas centring/zoom, briefing access and zero runtime exceptions.
- The Fieldcraft scenario suite includes an 18-case panel-fit matrix at 1024×768 and 844×390. Controls remained within the visible panels without page scrolling.

The JSON/text records are in `docs/verification-v10`. Counts describe automated assertions and scenarios, not separate physical devices. Several tests exercise overlapping pathways deliberately.

## Specific regression protection

The starting PM remained physically selectable on its new table. The replacement supply cabinet could be searched and the results displayed the same model previews. All five refuge doorways were traversed through the movement/collision function. The inventory and credits were compared before/after inspection; no values changed. Reopening the inspector reused one renderer, while ordinary thumbnail lists created none.

Map projection/unprojection and cursor-anchored zoom have pure tests. The UI test sends actual mouse and multi-touch events rather than assigning a zoom variable. Returning a recovered object targets the proper contact inside Relay 07. Closed missions are not returned as active navigation targets.

## Limits

No physical iPhone, iPad, wired controller or Bluetooth controller was tested here. Linux WebKit is useful compatibility evidence, not a claim that every iOS version or accessory works. Software WebGL does not provide representative mobile frame rates.

The broad world remains a prototype. The tests do not certify every conceivable navigation route, furniture layout or enemy encounter. Some equipment visuals are representative rather than exact replicas, and 36 item meshes remain original authored geometry. Imported cabinet meshes are not all articulated; more realistic opening animations remain on the roadmap.

GitHub CI and the actual published URL are a separate final gate. Their result belongs in `docs/RELEASE_10.0.md` after completion, not in an assumed pre-publication claim.

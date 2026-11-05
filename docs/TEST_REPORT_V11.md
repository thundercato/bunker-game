# Overgrowth verification

The release uses the previous inventory, mission, map and controller regression suites, plus environment-specific checks. Actual machine-readable results are stored under docs/verification-v11 and in the GitHub Actions artifacts.

The environment suite boots all model families; verifies that all 37 exterior door apertures remain traversable when their doors are open; follows every existing upper-storey stairway; tests bounded near/far tree rendering; retains original tree collider positions; physically targets and searches a replacement vehicle; checks that duplicate primitive car bodies are removed; and returns underground to verify exterior nature is no longer rendered. It also reopens the Atlas and current dossier.

The inventory suite retains real pointer drag and two-finger pinch events, unchanged bag/credits after inspection, physical PM and supply-locker access, all five refuge doorway crossings and an 18-case tablet/landscape-phone layout matrix.

The source adds ten Python checks for environmental model provenance, valid GLBs, tree geometry, local surface maps, runtime asset lists and unchanged save semantics. No raw unrelated model scene or million-triangle tree source is shipped.

Limits: software WebGL is not an iPhone GPU benchmark; no physical wired or Bluetooth controller was tested. General navigation checks do not certify every route or encounter. Near/far tree transitions are discrete and still benefit from playtesting. Exterior buildings use imported details plus authored collision shells and roof geometry. Successful automated checks are not a claim of commercial-release quality.

Public deployment and offline restarts are checked separately after publication; consult RELEASE_11.0.md for their observed result.

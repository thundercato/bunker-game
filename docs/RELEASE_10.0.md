# Fieldcraft v10.0.0: published and verified

**Play:** https://thundercato.github.io/bunker-game/

Published on 4 November 2026. The actual public site reports `10.0.0`, build `fieldcraft-10.0.0-20261104`.

## Release identity

- Pull request: https://github.com/thundercato/bunker-game/pull/75
- Tested development commit: `854d4c0ffa6727ccfc6e9edb80c24731331966d5`
- Published merge commit: `118276982c3b7b40b5398c735af717e767e3dc24`
- Verification and deployment workflow: https://github.com/thundercato/bunker-game/actions/runs/41928747802

GitHub's verification and deployment jobs succeeded. Its public-site test step also succeeded. An independent browser run against the actual published address subsequently passed all thirteen live checks at approximately 22:54 UTC.

## Live checks passed

1. Public release identity is Fieldcraft 10.0.0.
2. Python gameplay and all 51 imported model families load without asset errors.
3. Existing compatible v9 browser storage continues automatically.
4. Backpack model thumbnails load.
5. Interactive 3D inspection renders and zooms.
6. The atlas centres the selected objective and zooms.
7. The atlas opens the correct mission dossier.
8. The complete public runtime caches successfully.
9. Offline reload preserves inventory and credits.
10. Model inspection works offline.
11. The objective map works offline.
12. Controller Clinic remains available offline.
13. No runtime exceptions or missing assets were observed in that run.

## Included update

25 additional imported CC0 model families, extensive furniture and building-detail replacements, model-based previews for all 61 catalogue items, a reusable rotate/zoom inspector, a read-only item catalogue, a full-screen zoom/pan atlas, player/objective centring, and mission shortcuts. Of the item definitions, 25 use imported meshes and 36 use original authored geometry; buildings retain authored structural shells with imported details. This is not a claim that every object is an externally sourced scan.

The calmer Relay Lanterns refuge score remains. The version-9 campaign schema and `field-signal-dead-air-v9` storage key are unchanged. Do not clear browser website data to update; reload normally. Older temporary-host saves still require export/import because their browser storage is separate.

Pre-release verification is recorded in `docs/TEST_REPORT_V10.md`: 77 Python tests, 33 JavaScript tests, 35 Fieldcraft browser scenarios, 15 browser regression checks and seven Linux WebKit checks, with a tablet/phone layout matrix included in the browser suite.

Physical iPhone/iPad performance, connected-controller behaviour and haptics remain device-specific playtesting tasks. Simulated input and desktop WebKit checks do not certify a particular iOS accessory.

The play address stays the same for subsequent verified releases. Source, credits and verification records are preserved in the repository.

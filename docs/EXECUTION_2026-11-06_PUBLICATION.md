# Field Signal 11.1 publication, 6 November 2026

The user's latest instruction is: “Make it playable via a link. Give me the link
so I can add to my iPhone home page as a web app”. This authorises publishing the
previously tested candidate, superseding the earlier approval-pending checkpoint.

Public URL: https://thundercato.github.io/bunker-game/ . On iPhone, open in Safari,
choose Share → Add to Home Screen → Add, and rotate to landscape. The manifest
starts/scopes to `./` under `/bunker-game/` and uses standalone display, existing
192/512px PNG icons and an Apple touch icon. Apple web-app title is Field Signal.
Wait for the initial download and the Saves & offline ready message before
expecting a disconnected launch.

The release promotes the same verified gameplay from PR #83 / `e31b72a`, whose
165 Python tests, 13 JS suites, 51 syntax checks and all 10 browser suites passed:
https://github.com/thundercato/bunker-game/actions/runs/42271550520 . PR #81 is its
preview/compiler dependency. The separate editor-tools PR #82 is not part of
this publication.

Release preparation changes only public names/metadata, Apple install metadata,
the offline cache version and live verification checks. It does not change the
engine, content, save/settings/journal keys or rules. Release metadata is:

- Version: `11.1.0`.
- Build: `field-journal-quayside-11.1.0-20261106`.
- Cache: `field-signal-game-first-release-11-1`.
- Save schema: 9. Relay Lanterns retained.

The protected publication path is the existing main workflow: full verification,
Pages deployment, then actual public game/editor/moved-preview checks. The public
verifier additionally checks the release identity, standalone manifest, Apple
metadata/touch icon, approved scenes/catalogue and real mission journal. Current
run status and the downloadable public verification artifact are available from
https://github.com/thundercato/bunker-game/actions/workflows/deploy-pages.yml .
The actual served build is https://thundercato.github.io/bunker-game/release.json .

Local preparation: 165 Python tests passed; runtime JS syntax, real PNG dimensions,
manifest start/scope/display and matching cache-version constants were checked.
The live-verifier browser flow is also run against the local project subpath before
promotion. Production deployment must complete and match the build above before
the link is reported as the new version.

The existing candidate execution/performance notes retain exact scope, screenshots
and limitations. No physical iPhone/iPad or Mac/Safari test is claimed. Browser
installation metadata and cloud browser checks cannot establish device frame rate,
GPU memory or thermal behaviour. The remaining regions and full-map draft runtime
integration are still future work; publication does not claim the entire v12 plan.

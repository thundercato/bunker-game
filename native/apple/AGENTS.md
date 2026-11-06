# Native Apple subproject rules

Read docs/native-apple/CLOUD_FIRST_README.md before coding. This is a third experimental workstream, separate from the browser game and editor. Do not change production game state, canonical schemas, normal saves or Pages deployment. Use stable world IDs and a pinned/licensed asset subset.

Do real non-AR native rendering, not a WebView. The Codex Cloud VM may lack Xcode; use a separately scoped GitHub-hosted macOS CI runner to compile iPadOS and tvOS simulator targets, and explicitly report real results. Do not claim physical Apple performance, signing or TestFlight without device evidence and authorisation.

Commit checkpoints and PRs. Do not introduce credentials, provisioning profiles or font binaries. Prepare docs/native-apple/MAC_HANDOFF.md so the later local Mac Codex task continues rather than restarts the project.

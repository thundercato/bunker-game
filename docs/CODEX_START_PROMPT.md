# First Codex cloud task: copy the prompt below

Repository: `thundercato/bunker-game`. Start from latest `main`, then work in a feature branch.

```text
Continue Field Signal from this repository. Do not start a new project, restore an old ZIP or replace the existing game with a demonstration.

Read AGENTS.md, docs/CODEX_HANDOFF.md, docs/DESIGN_DECISIONS_2026-11-06.md, docs/NEXT_STEPS.md, docs/ARCHITECTURE_REVIEW.md and docs/CODEX_CLOUD_SETUP.md before editing. Inspect the actual code and current git status. The decisions in those documents replace the need to access my old chat.

Important: the working game is Overgrowth v11. The v1 building editor has an isolated actual-game preview. The full-map v2 editor already exists at site/editor/world.html, but its terrain, paths, water and building-placement drafts do not yet drive the playable world. Do not describe that integration as complete.

Start with M0: run the baseline tests, record any existing failures, inspect the render/worker costs and identify a concrete, bounded improvement. Then begin the smallest useful M1 vertical slice: one versioned world document/compiler and one moved/rotated building with its interior, doors, collision, container search points and mission marker all aligned in an isolated actual-game preview. If that needs multiple PRs, deliver the schema/compiler tests first and leave an exact checkpoint. Do not try to implement the entire v12 roadmap in one task.

Keep the existing game, saves, editor drafts, controller/touch input, Atlas, item inspection, calmer Relay Lanterns base music, asset licences and offline upgrades intact. Normal campaigns, preview campaigns, settings and journals must stay isolated. Use stable object IDs and local building coordinates. Do not migrate engines or remove Python without a measured proposal and my approval.

Use small readable commits. Run relevant Python/JavaScript tests and real browser interactions where the environment supports them; otherwise use CI and state the limitation. Capture actual screenshots and report browser errors and missing assets. Do not claim physical iPhone/Mac testing from headless Chromium/WebKit.

Update the handover/progress documents, open a PR and report exactly what works, what remains, tests run, and how I can test the result. Do not silently merge or publish to the live game. Ask only a genuinely blocking design question, one at a time; do not re-ask the decisions already recorded.
```

## Environment setup message, if Codex asks

```text
Prepare this repository using Python 3.12 and Node 22, matching .github/workflows/deploy-pages.yml. Follow docs/CODEX_CLOUD_SETUP.md. Install the pinned Playwright 1.56.1 and Chromium when supported, run the pure tests and python3 tools/build.py, and provide a local preview using python3 -m http.server 8000 --directory dist. Do not modify production configuration, embed credentials or start a runtime/engine migration as part of setup. Report any browser or network limitations.
```

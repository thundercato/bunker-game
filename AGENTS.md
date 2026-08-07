# Bunker Game Development Guide

## Project

Bunker Game is an existing Phaser 3 + TypeScript browser survival game. It is designed particularly for landscape iPhone/iPad PWA play and also supports keyboard and gamepad controls. Preserve the existing source, assets, history, gameplay, save compatibility, and architecture.

- Repository: `thundercato/bunker-game`
- Production: <https://thundercato.github.io/bunker-game/>
- Production deployment: GitHub Pages via `.github/workflows/deploy-pages.yml`
- Package manager: npm with `package-lock.json`
- Required runtime: Node.js 22 or newer

## Development commands

On Windows PowerShell on this PC, use `npm.cmd` because script execution policy may block the `npm.ps1` shim. On other shells, ordinary `npm` is equivalent.

```text
npm.cmd ci
npm.cmd run dev
npm.cmd run format
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run validate
npm.cmd run preview
```

- `npm.cmd run dev` starts Vite against the checked-in game source.
- `npm.cmd run validate` is the full local gate: formatting check, lint, typecheck, tests, and production build.
- `npm.cmd run build` writes the production site to `dist/`.
- `npm.cmd run preview` serves the built `dist/` locally.
- Use `npm ci`, not `npm install`, for a reproducible clean install. Commit intentional lockfile changes when dependencies change.

The `prepare:game` script is a retained historical migration chain. Normal development, validation, and builds must use the checked-in source and must not run this script: the legacy chain rewrites source and is not idempotent after formatting. Only run it when explicitly repairing or researching those historical migrations, and preserve unrelated work first.

## Architecture

- `src/scenes`: Phaser world, room, training, and gameplay scenes
- `src/input`: keyboard, gamepad, virtual/touch input
- `src/inventory`: persistent inventory state
- `src/systems`: survival and consumable systems
- `src/labyrinth`: deterministic procedural generation and room state
- `src/camera`: reusable static-room camera calculations
- `src/pwa`: service-worker update checks and cache coordination
- `src/core`: typed cross-module events/infrastructure
- `src/assets`: programmatic game assets
- `public`: PWA manifest, version metadata, icons, and service worker
- `tests`: Vitest regression/unit tests
- `scripts`: historical source preparation and regression patches

## Versioning

Use four-part incremental development versions such as `0.0.0.12`, `0.0.0.13`, and `0.0.0.14`. For each published development build, increment only the final number. Determine the current version from the repository; never assume an example is current.

Keep the version consistent everywhere it is recorded or displayed, including:

- `package.json` and the root package entry in `package-lock.json`
- `src/version.ts` and the start-screen version display
- `public/version.json` and the cache version in `public/sw.js`
- `README.md`, `CHANGELOG.md`, and relevant release/commit descriptions

Version changes and service-worker cache rotation belong to release work, not unrelated setup or gameplay changes.

## Development rules

- Preserve Phaser 3 + TypeScript and the existing GitHub Pages deployment system.
- Do not rewrite working systems unnecessarily. Make narrow, evidence-based changes.
- Keep systems modular; do not turn a primary scene into a monolithic file.
- Keep gameplay, UI, controls, weapons, inventory, survival, maps, rendering, audio, persistence, and interactions appropriately separated.
- Maintain iPhone/iPad touch, keyboard, and gamepad support and responsive landscape layouts.
- Account for iPhone safe areas, pointer capture, held input, dragging, and multitouch.
- Modal interfaces must suppress unintended movement and gameplay input.
- Player collision should remain centred around the character's feet.
- Preserve smooth analogue movement, tile collision, and the hybrid static-room/free-follow camera system.
- Preserve existing save compatibility wherever reasonably possible. Prefer additive migrations/defaults over resetting or replacing stored state.
- Never use destructive Git commands against unknown or uncommitted work.

## Gameplay philosophy

The game should feel tactile and physical. Where practical, loading ammunition, inserting magazines, sharpening and maintaining equipment, opening storage, inspecting objects, sleeping, and retrieving thrown weapons should be direct interactions rather than abstract progress buttons.

Persistent item and game state matters, including knife sharpness, ammunition remaining in boxes, rounds in magazines, chambered rounds, equipped weapon, dropped-item locations, storage, backpack, hunger, thirst, health, stamina, and game time.

## PWA and cache safety

This is both an installed iPhone Home Screen web app and a normal website. Updates must reliably become available after deployment. Treat `public/sw.js`, `public/version.json`, `src/version.ts`, registration scope, relative asset paths, and the Vite base path as a coordinated release system. Do not leave users permanently on stale bundles or assets. Preserve the network-first handling for navigation and freshness-critical metadata unless a tested replacement is intentional.

## Release workflow

When asked to implement and publish a new Bunker version:

1. Inspect current code and Git state; preserve unrelated/uncommitted work.
2. Fetch and integrate the current remote state safely.
3. Implement only the requested changes.
4. Increment only the final component of the four-part version and update every version source.
5. Update `CHANGELOG.md` and release notes as appropriate.
6. Run `npm.cmd run format`.
7. Run `npm.cmd run validate` (format check, lint, typecheck, tests, build).
8. Fix failures rather than merely reporting routine errors.
9. Review the full Git diff and exclude unrelated files.
10. Commit with a meaningful message and push to GitHub.
11. Check the GitHub Actions run for that exact commit SHA.
12. Confirm the GitHub Pages deployment for that exact commit succeeded and verify production responds.
13. Only then report that the version is live.

Never claim deployment merely because a local build passes.

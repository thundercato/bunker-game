# Field Signal

Atmospheric first-person survival for iPhone, iPad and desktop browsers. Python owns the simulation; Three.js renders the world. This repository replaces the retired Bunker Game at the owner’s request.

## Recovery checkpoint

The complete working **Stillwater v8** runtime has been recovered, including Python/WebAssembly, licensed 3D models, textures, music, effects and Controller Clinic. This commit is a recovery checkpoint, not a claim that v9 is released. The original Bunker Game is preserved at branch `archive/retired-bunker-before-field-signal`.

## Structure

- `site/`: self-contained browser game and Python engine; every runtime asset is local.
- `site/tests/`: Python and input/audio tests.
- `docs/ROADMAP.md`: v9 requirements and development checkpoints.
- `tools/build.py`: deterministic static-site packaging.

Run locally: `python3 -m http.server 8000 --directory site`, then open http://localhost:8000. For phone/offline/controller deployment, use HTTPS.

Tests: `cd site && python3 -m unittest discover -s tests -p 'test_*.py' -v` and `node tests/test_client.mjs`.

Build: `python3 tools/build.py`. Output: `dist/`.

Do not commit personal saves, access tokens, browser profiles or font files. All third-party credits remain in `site/V7_CREDITS.md` and `site/V8_CREDITS.md`.

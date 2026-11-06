# M0 execution: baseline and bounded M1 choice

Runtime/content baseline: `6b4f9fb9401398a65eee576f40b2d80805ef6c76`, latest
`origin/main` fetched on 6 November 2026. New branch:
`feat/world-document-compiler`. Clean clone; no old ZIP/import restoration.
All required handover/decision/architecture/setup documents read before changes.

## Actual verification

Environment: Linux x86_64, five exposed AMD EPYC 9V74 CPUs, Python 3.12.14,
Node 24.22.1, Playwright 1.56.1, headless Chromium 141.0.7390.37/SwiftShader.
Node 22.23.4 was subsequently obtained for final pure JS verification to match CI.
No physical iPhone/iPad, Mac Safari, wired controller or thermal testing claimed.

| Command | Fresh baseline result |
| --- | --- |
| `python3 -m unittest discover -s site/tests -p 'test_*.py' -v` | 96 passed, 1.691 s |
| `for file in site/*.js site/editor/*.js; do node --check "$file"; done` | All passed |
| `node site/tests/test_client.mjs` | 15 passed |
| `node site/tests/test_atlas.mjs` | 18 passed |
| `node site/tests/test_layout.mjs` | 54 passed |
| `node site/tests/test_world_v2.mjs` | Passed (single aggregate script) |
| `python3 tools/build.py` | Passed; 273 self-contained files; 15 missions, 139 containers, 35 enemies, 61 item visuals/previews |
| `node tests/ci_smoke.cjs` | Exit 0 |
| `node tests/fieldcraft_browser.cjs` | Exit 0 |
| `node tests/overgrowth_browser.cjs` | Exit 0 |
| `node tests/editor_controls.cjs` | Exit 0 |
| `node tests/editor_browser.cjs` | Exit 0 |
| `node tests/world_v2_browser.cjs` | Exit 0 |

Browser suites ran sequentially. They exercised actual UI mouse/keyboard actions,
Python worker/WebGL, project subpath, controller simulation, legacy v8 import,
offline reboot, Atlas/inspection, doors/stairs, editor gizmos/drafts/import/export,
real v1 game preview and campaign/settings/journal sentinels. No baseline test
failure was reproduced. They do not prove every historical service-worker upgrade;
there is no shipped runtime/cache change in this compiler-only slice.

Full browser/Python logs: [baseline-tests.txt](verification/2026-11-06-m0/baseline-tests.txt).
Screenshots are real output, including [v1 preview search](verification/2026-11-06-m0/editor-game-preview.jpg),
[building editor](verification/2026-11-06-m0/editor-station.jpg),
[refuge](verification/2026-11-06-m0/refuge.jpg),
[forest](verification/2026-11-06-m0/forest.jpg),
[inspection](verification/2026-11-06-m0/item-inspection.jpg) and
[world brush](verification/2026-11-06-m0/world-brush.jpg).
The hut preview screenshot verifies the existing v1 feature; it is not evidence of
the new moved/rotated-world preview. The distant/foggy v2 overview is its current
proxy renderer, not a new terrain rendering implementation.

## Repeatable diagnostics

After the normal build/install, run these sequentially with other browser suites:

```sh
node tests/performance_baseline.cjs
node tests/performance_baseline.cjs --worker-only
```

Output: `test-results/performance/`. The first run used unchanged baseline runtime
files plus test-only wrappers; the independent second run isolates the worker.
Preserved raw [baseline.json](verification/2026-11-06-m0/baseline.json) and
[isolated-worker.json](verification/2026-11-06-m0/isolated-worker.json).
The current harness also includes the worker diagnostic at the end of a full run.

Game viewport 844×500, low quality, pixel ratio 0.35, shadows off. Each scene
samples 40 frames after an approximately 10-frame warm-up (the recorded run could
include transition frames in warm-up; the harness now resets it per scene).
Positions: refuge `(-500,20)`, cottage
`(-30,-57)`, woodland `(-55,-135)`, village wreck `(-20,-178.2)`. Restored fixtures
disable enemies except the final enemy fixture. Inspector uses real Pack UI;
brush uses 20 synchronous commands plus an actual mouse stroke at 1440×900.

| Scene | Frame interval median / p95, ms | JS world.frame median / p95, ms | renderer.render median, ms | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Refuge | 398.2 / 670.9 | 9.4 / 18.0 | 8.0 | 190 | 185,945 |
| Cottage | 1294.0 / 2363.3 | 15.6 / 38.3 | 13.8 | 854 | 538,499 |
| Woodland | 1405.8 / 2827.7 | 13.6 / 33.5 | 11.3 | 663 | 622,927 |
| Village wreck | 833.6 / 1544.5 | 13.1 / 27.2 | 10.4 | 474 | 407,473 |
| Enemy/transient-effects fixture | 787.8 / 1549.4 | 11.8 / 30.7 | 10.1 | 476 | 407,655 |

The final fixture emits a flash/slash/tracer once, before warm-up. Most transient
effects expire before steady sampling. It is **not** a sustained combat/particle
stress test; add repeated live firing/rain with controlled duration in the next
performance task. No frame-budget pass/fail is asserted for this software renderer.

Additional measurements:

- Startup to enabled Silent: 5.110 s locally; initial worker round trip 2.795 s.
- Worker under rendered scenes: 218 ticks, round-trip median 11.3 ms / p95 28.6 ms;
  roughly 37.7 kB response per tick. These include main-thread scheduling delay.
- Independent idle-refuge worker (100 ticks, no game renderer): handler median
  4.6 ms / p95 7.8 ms; round trip 5.3 / 8.3 ms; response about 37.8 kB.
  Handler includes Python API plus JSON encoding/decoding, not just rule execution.
  Independent worker init: handler 2.117 s, round trip 2.140 s.
- Scene-referenced geometry attributes/index buffers: about 101.2 MB. Texture
  RGBA+mipmap estimate: 443.1 MB. Estimates cover referenced scene resources,
  including hidden objects; shared backing buffers/images can be counted more than
  once. They are neither actual GPU allocation nor peak process memory. Renderer
  allocation counters grow from 187 geometries/83 textures in refuge to about
  1136/262 outdoors as assets become used.
- Inspector: 1 draw / 1,408 triangles; repeated synchronous draw median/p95 0.1 ms.
  GPU completion, initial shader compilation and thumbnail generation are excluded.
- v2 synchronous terrain stroke including refresh/persistence: median 9.4 ms /
  p95 16.1 ms, 20 samples with an initially empty foliage list. Not large-forest
  scaling evidence. The code rebuilds the full authoring scene on each refresh.
- Longest resource durations locally: v7 model JSON chunks 805–821 ms,
  2.29–5.51 MB each; surface JSON 624 ms / 3.89 MB. Resource durations combine
  local transfer/scheduling; they do not isolate asset decode or browser compilation.
- GPU timer extension was exposed, but no reliable GPU timing samples were collected.
  `renderer.render` measures JS submission; frame intervals include software-GPU
  backpressure/scheduling. HUD/input work outside `world.frame` is not included in
  that method's timing. Asset decode time, peak memory, mobile heat and GPU time
  remain unmeasured.

## Evidence-ranked costs and decision

1. Outdoor rendering/submission is the main observed concern: 474–854 draws,
   407k–623k triangles; renderer calls account for most measured world.frame JS
   time. Software frame intervals are much worse and cannot predict hardware fps.
   Next experiments should measure visibility, batching and asset budgets on a
   target device, with a complete main-thread/GPU trace.
2. Resident asset pressure and startup merit measurement on mobile: large scene
   buffer/texture estimates and eager JSON model loads. Investigate asset decoding,
   texture reuse/compression and regional loading before increasing visual budgets.
3. Worker init is a material part of startup. Steady rules+JSON are measurable,
   but isolated handler cost does not explain the huge software-rendered frame
   gaps. Optimise message payloads only after behaviour/save parity tests.
4. Editor refresh already costs up to a frame budget in this small empty-foliage
   case. Incremental rebuilds should precede rendering thousands of real props.

Keep Three.js and Python. These observations do not justify an engine/language
migration. Do not spend this task chasing synthetic fps: the smallest correctness
slice is a pure versioned document/compiler, followed by a separate preview adapter.
Existing v2 terrain/roads/water/building drafts still do not drive the playable game.
See [WORLD_DOCUMENT.md](WORLD_DOCUMENT.md) for the implemented contract, test command
and exact next integration changes.

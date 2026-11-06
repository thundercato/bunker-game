# Candidate performance diagnostics, 6 November 2026

The actual game-first candidate completed five settled rendering samples and an
isolated Python-worker comparison. `node tests/campaign_performance.cjs` exited 0;
there were no page errors or missing runtime resources. This is a cloud
SwiftShader diagnostic, not a physical-device frame-rate or release-readiness
claim. No production publication was performed by this diagnostic.

Final measured runtime: commit `edffe7b118961406a6516ac079f706375a725ab8` on
`feat/game-first-candidate`, 18:01:35–18:03:54 UTC. An earlier run at
`d0c0472a2949b8165973ca23e65d7a3d2d79018d`, 17:54:27–17:56:43 UTC, identified
duplicate house material loads. The repeat followed the resulting three-line
material-palette sharing fix; the harness and fixtures were unchanged. Both
reports record Git working-tree status and SHA-256 hashes of the actual `dist/`
gameplay files. Only documentation/evidence or this new harness was dirty during
these runs; candidate runtime files remained stable within each run.

Environment: Linux x64, AMD EPYC 9V74, **four exposed CPUs**, Node 24.22.1,
Playwright's Chromium 141.0.7390.37, ANGLE/Vulkan SwiftShader. M0 used the same CPU
model, Node/browser versions and rendering profile but recorded **five** exposed
CPUs. Consequently the machine allocation is not identical. Viewport 844 × 500,
low quality, shadows disabled, pixel ratio 0.35; the actual WebGL drawing buffer
was 295 × 175. The run was exclusive of other local browser/GPU suites.

## Rendering results

Each scene discarded ten warm-up frames, then captured **exactly 20** actual
`world.frame` calls. State was restored through the real save-import UI, using
reviewed traversable poses. Enemies were disabled; the normal world, lighting,
weather and clock continued to update. Screenshots are actual game output at the
measured resolution. These samples do not exercise sustained firing, particles,
travel, a large enemy encounter or shader compilation.

| Scene | Frame interval median / p95, ms | World work median / p95, ms | Render submission median / p95, ms | Draw calls median / p95 | Triangles median / p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Refuge corridor | 389.5 / 725.2 | 11.9 / 24.7 | 9.1 / 23.4 | 198 / 198 | 186,871 / 186,871 |
| Authored cottage kitchen | 958.1 / 1,911.3 | 13.8 / 30.2 | 9.6 / 28.8 | 275 / 275 | 481,528 / 481,528 |
| Village street | 732.6 / 1,333.4 | 15.0 / 24.9 | 12.6 / 23.6 | 601 / 601 | 317,877 / 317,877 |
| Woodland railway crossing | 561.3 / 852.1 | 16.7 / 34.6 | 14.4 / 33.3 | 953 / 953 | 382,557 / 382,557 |
| Docks crane approach | 365.1 / 672.6 | 10.0 / 15.7 | 8.5 / 13.1 | 219 / 219 | 203,064 / 203,064 |

Fixture coordinates `(x,z; yaw,pitch)` were refuge `(-500,20; 0,0)`, cottage
`(-29.3,-60.3; π/2,-0.12)`, street `(-8,-179; π/2,-0.05)`, crossing
`(-96,-115; -π/2,-0.04)` and docks `(103,-148; -1.28,0.38)`. All actual feet were
at y=0. The report preserves actual player/camera poses and raw frame samples.

World work includes the world method and renderer submission; it excludes HUD,
input, simulation scheduling and other application work outside that method.
`renderer.render` measures JavaScript submission, including possible driver
backpressure. `EXT_disjoint_timer_query_webgl2` was exposed in all scenes, but no
reliable GPU completion timings were collected. Frame intervals include software
GPU/scheduler backpressure; converting them into hardware fps would be misleading.

Startup to enabled Silent was 6.546 seconds in the final run, versus 6.139 seconds
before material sharing, on the local server. It includes game
construction and asset loading, rather than isolating decode or shader costs.

## Resource counts and atlas duplication

All five final views referenced the same scene graph: **3,298 geometry objects,
109,332,356 geometry attribute/index bytes, 425 Texture objects and 398 decoded
image identities**. Deduplicating geometry backing buffers produced the same
109,332,356-byte estimate. Summing RGBA8-plus-mipmap estimates by Texture object
gave **468,651,691 bytes**; deduplicating actual image identities gave approximately
383,717,035 bytes. Both include hidden scene references and are estimates, not
actual GPU allocation, driver memory or peak process memory.

The first run revealed that each of the four authored homes separately loaded
the same material palette. Sharing one palette per World produced this measured
reduction:

| Scene-reference measure | Before sharing | Final shared palette |
| --- | ---: | ---: |
| Texture objects | 437 | 425 |
| Decoded image identities | 410 | 398 |
| RGBA+mipmap estimate by Texture object | 535,760,555 bytes | 468,651,691 bytes |
| RGBA+mipmap estimate by image identity | 450,825,899 bytes | 383,717,035 bytes |
| Geometry attribute/index bytes | 109,332,356 | 109,332,356 |

The estimate falls by **67,108,864 bytes (64 MiB), or 12.5%** when summed by
Texture object. All five draw-call and triangle counts are unchanged. The final
468.7 MB reference estimate still exceeds M0's 443.1 MB by approximately 25.5 MB;
the candidate has additional scene content. The two short software runs show
timing variance in both directions, so no frame-rate improvement is attributed
to this memory fix.

The diagnostic identified 243 unique image URLs accounting for approximately
304,899,072 RGBA bytes. Another 144 Texture objects had no identifiable image URL
(including generated/embedded imagery); that partial URL figure cannot describe
total residency. Test-only fetch/createImageBitmap tags recovered URL identity
without changing loader caches, texture instances or shipped code.

Only two of the four catalogue atlas files are used by the measured candidate:

| Campaign atlas URL | Actual Texture objects | Actual image identities | Summed RGBA+mipmap estimate |
| --- | ---: | ---: | ---: |
| `assets/campaign/textures/city-kit-roads.png` | 2 | 2 | 699,051 bytes |
| `assets/campaign/textures/city-kit-industrial.png` | 3 | 3 | 1,048,576 bytes |

Thus two source URLs currently create **five Texture/image objects**, with a
combined estimate of 1,747,627 bytes. The unique-source lower bound would be
699,051 bytes for those two 256px files. GLTFLoader's parser-local caches do not
establish cross-model texture reuse. The asset registry's `textureSharing` field
describes shared source content; four shipped atlas URLs do not prove four GPU
allocations. Visible usage, upload policy and possible driver sharing still affect
actual GPU residency.

Three.js allocation counters increased from 192 geometries/86 textures at refuge
to 1,762/274 after visiting all five final views. The first run ended at 1,549/268;
these deferred/cumulative counters do not track the reference-byte reduction.
The cause of the final run's higher allocation counters was not isolated. The
established result is lower scene-referenced texture duplication, with actual GPU
bytes still unmeasured. High resident legacy asset
pressure and the crossing's 953 draw calls remain practical targets for measured
regional loading, batching and culling work before mobile performance claims.

## Isolated worker comparison

After closing the game page, separate idle pages each ran 100 sequential ticks
with dt=0.18, the initial refuge player, active=false, no sprint/crouch and empty
sight data. The original case used `Simulation()` and original `world.json`.
The candidate used **the actual imported `world-campaign.js` DATA override**,
including its campaign geometry/rules, exactly as the application does. Both use
the current candidate branch's engine; the original case is not a checkout of
historical M0 engine code.

| Worker mode | Init handler / round trip | Tick handler median / p95 | Tick round trip median / p95 | Response bytes median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Original world data, fresh comparison | 1,828.2 / 1,844.8 ms | 4.5 / 6.1 ms | 5.1 / 6.7 ms | 37,787 / 37,789 |
| Actual candidate DATA override | 1,788.5 / 1,802.1 ms | 4.8 / 5.8 ms | 5.2 / 6.4 ms | 37,803 / 37,805 |
| Historical M0 independent run | 2,117.3 / 2,139.9 ms | 4.6 / 7.8 ms | 5.3 / 8.3 ms | 37,787 / 37,789 |

Candidate override preparation took 146.5 ms before worker construction and
produced 329,658 JSON bytes. Its idle handler/round-trip medians were within
0.3/0.1 ms of the fresh original-data comparison in this sample. In the earlier
run, both modes measured 4.7 ms handler and 5.3 ms round-trip medians. Handler
timings include Python API
execution and JSON encode/decode; round trips add main-thread scheduling. The
candidate runs second, so its lower one-off init figure is not evidence of an
init optimisation. No worker-only speedup or engine migration is inferred.

## Reproduction and evidence

```sh
python3 tools/build.py
node --check tests/campaign_performance.cjs
node tests/campaign_performance.cjs
# Optional independent repeat without a game renderer:
node tests/campaign_performance.cjs --worker-only
```

The syntax check and both full runs passed. Do not run this harness concurrently
with other local browser/WebGL suites. It asserts candidate activation, no runtime
errors/missing files, exact sample counts and actual low/shadow/pixel-ratio
settings. It deliberately has no frame-budget pass/fail threshold.

Generated evidence is in `test-results/candidate-performance/`: `candidate.json`
contains final raw samples, runtime hashes, M0 references and resource identities;
`refuge.jpg`, `authored-cottage-kitchen.jpg`, `village-street.jpg`,
`woodland-crossing.jpg` and `docks-crane.jpg` are actual final measured views.
`before-material-sharing/` preserves the complete first report and its five
screenshots. This diagnostic commit adds only the new harness and this note;
the campaign's final
evidence checkpoint preserves the generated report/screenshots separately.

Historical M0 used 40 samples and different cottage, woodland and street poses.
Its reports remain in `docs/verification/2026-11-06-m0/`. Those values supply
context, rather than a matched-camera before/after speedup experiment. No physical
iPhone/iPad, Mac Safari, sustained thermal behaviour, controller latency, GPU
memory allocation or physical-device fps was measured here. The east bank,
military compound and bog were not sampled or presented as overhauled districts.

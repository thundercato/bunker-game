# Field Signal architecture and performance review

Prepared 6 November 2026. This is an engineering recommendation, not an approved migration or a benchmark result.

## Recommendation

Keep the working Three.js browser renderer and the custom editor for the next editor-integration milestones. Introduce clear module boundaries and, incrementally, TypeScript where it improves data contracts and tooling. Measure the Python worker and rendering separately. Consider a staged port of browser-side gameplay rules to TypeScript only after profiling and save/behaviour parity tests; keep Python for build tools, validation and reference tests where useful.

Do not rewrite the game in a new engine simply to make models look less boxy. The immediate visual problems include scene layout, building-kit compatibility, materials, lighting, asset budgets and visibility. None is automatically solved by changing language or engine. No ray tracing requirement is needed for the improvements described here.

## What actually runs now

The game is not a Python 3D renderer. Three.js/JavaScript and WebGL draw the world. Python rules run inside Pyodide in a Web Worker through `bridge.js` and `sim-worker.js`. The worker initializes a Python runtime, receives actions and serializes results. This has download/startup/memory and message/serialization costs, but their share of frame time has not been measured in this handover.

The current source also contains layered `world-v*` classes and a large orchestration/UI module. Refactoring those into data-driven systems is a maintainability and correctness improvement; do not promise a frame-rate gain from file renaming alone. TypeScript compiles to JavaScript and is not intrinsically a faster GPU renderer.

The full-world editor is primarily JavaScript already. Python is not the reason its v2 map currently uses proxies. Those are an intentional authoring-foundation simplification; the missing work is a shared schema/compiler and efficient real-model rendering.

## Options

| Option | Strength for this project | Trade-off |
| --- | --- | --- |
| Keep Three.js, improve architecture/asset pipeline | Reuses the current renderer, controls, custom editor, item viewer and assets. Lowest disruption. Can retain WebGL2 and evaluate newer WebGPU support separately. | We maintain more gameplay/editor systems ourselves. Existing r170-era integration must be audited before any renderer upgrade. |
| Babylon.js with TypeScript | A more integrated web-oriented engine with scene, materials, asset loading, inspection and physics ecosystem. WebGL and WebGPU are available. | THREE-specific scene/UI/editor integration must be rewritten or adapted. Model compatibility does not mean code compatibility. No measured evidence it is faster for our scenes yet. |
| PlayCanvas | Web-first engine and established browser visual editor; standalone engine usage is also available. Could reduce custom engine/editor maintenance for a new project. | Decide whether its hosted editor replaces or duplicates Field Signal's tools. A full move changes the asset/authoring workflow and needs an account/service/licence review where relevant. |
| Godot | Worth evaluating for a genuine native mobile/desktop application and mature scene authoring. | Its documented web export has different rendering and platform constraints from native. Migrating the existing browser game/editor is substantial, not an automatic iPhone-web improvement. |

Preferred now: Three.js plus better data, testing and performance engineering. Preferred experiment if we need a more integrated WEB engine later: a bounded Babylon.js or PlayCanvas comparison using the same scene. Preferred native discussion later: an actual native engine prototype, not assuming a web wrapper lifts browser/GPU limits. Adam has not approved any of those migrations.

## WebGPU and compatibility

WebGL/WebGPU are browser graphics APIs, not an OpenAI API or a hosted rendering service. WebGPU is not synonymous with ray tracing. Current Three.js documentation describes a WebGPU renderer with WebGL2 fallback, but upgrading is not simply changing one constructor in this older project. Audit materials, shaders, post-processing, loaders, renderer timing, controls and all supported browsers. Keep an explicit WebGL2 path until tested compatibility warrants a change.

A fallback renderer is not a promise that every WebGPU-only technique works on old devices. Benchmark both paths. No promise of a fixed percentage improvement or 'works on every phone' is justified before measurement.

## Improvements likely to matter more immediately

### 1. Profile the frame and loading pipeline

Measure main-thread update/render work, GPU work when supported, worker tick duration, serialization/message volume, draw calls, texture/geometry memory estimates, asset decode time and long frames. Distinguish CPU, GPU, fill-rate, network and startup problems. Test sustained sessions for heat/throttling and device memory, not just one still image.

### 2. Render less unnecessary work

Use bounded region/chunk visibility, frustum/distance culling and appropriate indoor visibility. Reuse/instance foliage, rocks, pipes and props sharing mesh/materials. Merge static geometry only where it does not break editing, picking, material behaviour or culling granularity. Use low-detail distant representations. Simplify collision separately from visual geometry.

### 3. Improve assets rather than just increasing resolution

Use a coherent modular building kit whose door/window/floor dimensions match the interior. Standardise scale, pivots, normals, collision proxies and provenance at import. Preserve enough geometry for silhouettes and nearby detail while reducing invisible surfaces and redundant materials. glTF/GLB is the practical interchange format. Mesh compression can reduce transfer size but has decode costs and is not itself a guarantee of fewer triangles or faster rendering.

Texture file size is not GPU memory usage. Evaluate KTX2/Basis GPU-compressed textures and sensible per-object texture sizes. A small JPEG can still decode into a large texture. Do not indiscriminately give every small prop a 4K material or replace everything with huge scans.

### 4. Lighting and atmosphere without ray tracing

Use coherent physically based materials, baked ambient occlusion/lightmaps where appropriate, believable contact shading, restrained dynamic lights and a few strategically shadow-casting sources. Avoid dozens of shadowed lamps. Instance/merge static pipe/clutter sets without losing their editor handles. Keep local hum/flicker coupled to visible fixtures. Fog can support atmosphere and distance budgets, but must not hide genuine layout errors.

### 5. Mobile-friendly resolution, foliage and effects

Make quality presets change real budgets: render scale, visible detail, shadows, particles and transparencies. Dense transparent foliage and mist can be expensive even with moderate polygon counts. Use masked foliage where suitable, proper mipmaps and stable level transitions. Cap pixel ratio and consider measured adaptive resolution. Preserve readable UI independently of 3D render scale.

### 6. Keep editing responsive

Build the v2 editor around a durable document, command/undo transactions, spatial indexing and incremental rebuilds. Avoid reconstructing every object and mesh on each pointer movement. Rebuild only affected terrain tiles and foundation/path dependants. Render on demand when the editor is idle if the scene permits. Separate high-quality gameplay preview from responsive editing representation, clearly showing which is active.

### 7. Reduce runtime/language duplication safely

A long-term TypeScript gameplay layer could eliminate the need to ship Python to every player's browser and reduce cross-language serialization. That is a plausible architectural benefit, not a measured result here. Port deterministic pure systems one at a time behind a stable interface. Compare seeded actions, outcomes, save migrations and replay fixtures against Python. Do not maintain two diverging sets of collision or mission rules indefinitely.

## Native and cloud distinctions

Codex cloud is where development/test tasks run. GitHub Pages is where the browser build is hosted. The user's phone renders locally; Codex is not streaming the game or supplying its GPU. Developing in the cloud does not require a browser-only shipping target, and a phone game does not require cloud Codex. Native iOS delivery introduces its own build/signing/distribution/device-test workflow.

A native application may offer different platform integration and rendering control, but the same assets still need budgets and good scene design. Preserve world, mission, loot and save data independently of the chosen renderer so a future migration is possible without redesigning the game.

## Primary references checked for this review

- Three.js WebGPURenderer and WebGL2 fallback: https://threejs.org/manual/en/webgpurenderer.html
- Three.js instancing: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js object/draw-call optimisation: https://threejs.org/manual/pages/optimize-lots-of-objects.html
- Three.js texture memory: https://threejs.org/manual/pages/textures.html
- Three.js KTX2 loader: https://threejs.org/docs/pages/KTX2Loader.html
- Pyodide workers: https://pyodide.org/en/stable/usage/index.html
- Babylon.js engine capabilities: https://www.babylonjs.com/specifications/
- Babylon.js WebGPU documentation: https://doc.babylonjs.com/setup/support/webGPU/
- PlayCanvas standalone engine and editor choices: https://developer.playcanvas.com/user-manual/engine/
- PlayCanvas browser support: https://developer.playcanvas.com/user-manual/engine/supported-browsers/
- PlayCanvas optimisation guidance: https://developer.playcanvas.com/user-manual/optimization/guidelines/
- Godot web export limitations: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- Godot renderer choices: https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html

Versions/support can change. Recheck primary documentation at the time of an actual migration. The repository's pinned versions and measured target-device behaviour take precedence over generic engine marketing.

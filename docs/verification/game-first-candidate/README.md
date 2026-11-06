# Actual candidate verification output

See [the execution checkpoint](../../EXECUTION_2026-11-06_GAME_FIRST.md) and
[performance method/results](../../CANDIDATE_PERFORMANCE.md). `manifest.json`
records source paths, byte counts and SHA256 hashes of the unchanged captures.

These are actual Three.js/editor/Pyodide outputs. Representative scene positions
use supported save-import fixtures; the long First signal expedition is separately
verified in the real Python engine. They are not concept renders or physical-device
performance evidence. Chromium is141 with SwiftShader. Full-game/moved-preview
harnesses and pure suites use Node22; local component/editor/performance wrappers
used Node24. The final PR pipeline uses Node22 throughout.

The performance directory preserves the final authoritative-road report and two
preceding measured reports. The material-sharing pair has identical geometry and
removes64MiB from a reference-byte estimate. The final road-layer change is kept
separate. No GPU allocation byte measurement or physical iPhone/Mac pass is claimed.

Local assertions:165 Python,13 Node suites+51 syntax,25 candidate gameplay,
19 authored-home preview,31 journal,15 moved-hut. Existing full regression suites
also run in the final PR checks, with their complete screenshots/logs in its
verification artifact. Nothing in this directory proves production deployment.

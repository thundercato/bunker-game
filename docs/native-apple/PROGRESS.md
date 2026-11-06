# Native Apple experiment — execution record

## Baseline and isolation

Started 6 November 2026 on `codex/apple-native-prototype`, from main
`25cd697be9d68a88fe8b66b5cfbcee268c565d6d`. Reviewed root and native AGENTS,
NATIVE_CLOUD_TO_MAC, CLOUD_FIRST_README, CODEX_HANDOFF, WORLD_DOCUMENT,
DESIGN_DECISIONS, NEXT_STEPS, ARCHITECTURE_REVIEW and CODEX_CLOUD_SETUP.
Reviewed concurrent PR #82 (editor; no changes adopted) and #86 (native guidance).
The source web runtime, editor, saves, schemas, assets and Pages workflow remain
read-only. No merge, publication, signing or TestFlight is authorised.

## Implementation checkpoint

The bounded scene is the existing two-storey Forester’s cottage, compiled from
the reviewed world-document/layout compiler. Swift simulation and native Apple
rendering consume one exported world-pose scene; stable IDs link doors, collision
and searches. Licensed source meshes are converted deterministically, with hashes
and provenance, rather than downloading replacement art. The prototype has its
own native-only persistence namespace.

Work in progress: source, portable conversion tests, reproducible Xcode project,
unsigned iPad/tvOS simulator CI, and Mac continuation instructions. No successful
Apple compilation or device test is claimed by this initial checkpoint.

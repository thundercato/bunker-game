# Lossless editor checkpoint history

Editor 2.1.3 keeps the existing canonical world document and legacy draft keys.
The change is confined to internal checkpoint metadata, never runtime world data.
It fixes practical quota failures caused by serialising thirty full forest copies.

`session.js` retains complete in-memory documents for undo/redo. On save,
`history-codec.js` stores optional `history` metadata alongside the unchanged full
`document` in the existing version1 checkpoint. Each chain starts from the current
JSON document and walks nearest-first through prior/redo documents, recording
`[commonPrefixLength, commonSuffixLength, insertedMiddle]`. Decoding recreates the
original stacks in their existing order; it never rerolls instances or trims data.

The loader decodes against the original parsed document **before** canonical
validation/default adoption can change property ordering. Every decoded document
then passes the existing source/asset/world validators. Old checkpoints with full
`past`/`future` arrays remain readable. New authoring still uses the existing
thirty-prior-state policy; accepted legacy histories retain up to sixty total
transitions as they move between stacks, including thirty past + thirty future.

Strict integer/index, format, combined-state and decoded-size limits reject bad
history before adoption. Current bounds are sixty transitions, four million UTF16
code units per document and 120 million decoded code units total. Rejected originals
remain recoverable/downloadable. Recovery uses the same codec and canonical checks,
backing up active unsaved/stored work before any primary write.

Canonical-first saves, pending legacy-mirror fingerprints and concurrent raw backup
rules are unchanged. The canonical document and legacy mirror bytes remain normal
JSON; portable world/layout exports do not include compressed UI history. No
campaign, settings, journal, preview or draft key is renamed or cleared.

## Verified capacity and limits

Node serialization/simulated-quota diagnostics (three interiors, thirty incremental
strokes, concrete UUID instances) estimate total UTF16 checkpoint+mirror bytes:

| Instances | Full-snapshot checkpoint | Lossless checkpoint |
| --- | --- | --- |
| 500 | 7.219 MiB | 0.531 MiB |
| 1,000 | 11.505 MiB | 0.798 MiB |
| 5,000 | 45.941 MiB | 2.951 MiB |
| 12,000 | 106.296 MiB | 6.723 MiB |

These are byte-accounting estimates, not measured browser quotas. The real Chromium
storage test saves 5,000 instances and thirty frames, verifies every frame/current
world/ID hash after reload, uses actual undo/redo/navigation, converts an old full
checkpoint and exercises concurrent/corrupt recovery. It accepted a 792,185-character
checkpoint; total stored key/value UTF16 estimate 3,168,256 bytes. Forest rendering
is hidden for this storage test; it is not a dense-scene FPS benchmark.

Maximum-density documents or existing backup libraries can still exceed origin
quota. Retain the existing export/leave guards and pending-mirror recovery; never
solve capacity by deleting saves, dropping history or clearing user storage.
Physical Safari/device capacity and dense-scene rendering remain separate checks.

Tests: `site/tests/editor_v2_history.mjs` (including 120 seeded splice vectors),
existing session recovery aggregate, 24 recovery cases and the 13-check real history
browser suite. Evidence/provenance: `verification-editor-v2/editor213/`.

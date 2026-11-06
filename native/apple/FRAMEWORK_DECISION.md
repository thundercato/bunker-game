# Bounded renderer decision

Checked 6 November 2026 against Apple's live documentation metadata and GitHub's
runner image manifest. This is an isolated experiment, not a recommendation to
replace Field Signal's browser engine.

- RealityKit supports tvOS starting at **26.0**. Earlier claims that it has no
  Apple TV support are out of date. Its non-AR rendering is a viable follow-up.
- SceneKit supports iPadOS from 8.0 and tvOS from 9.0, but Apple **deprecated it
  at 26.0**. It remains in the SDK: deprecation is distinct from removal. We use
  its shared `SCNView`, geometry/material and spotlight APIs for this bounded
  first-person prototype, while keeping simulation and imported data independent
  of that renderer. This permits the same actual renderer on both targets with a
  small auditable mesh pipeline. It incurs a future renderer migration cost.
- Metal is available on both target families and offers lower level rendering;
  writing a complete material, lighting and scene layer adds scope without
  answering this prototype's world/interaction compatibility question.
- Both project deployment targets are 26.0. CI selects the highest installed
  Xcode >=26 on `macos-latest`, logs the exact version/SDKs/runtimes, then compiles
  and tests both simulators. A label or framework document alone is not a build.
  The inspected macOS 26 runner manifest lists Xcode 26.6 and tvOS/iOS 26.5 SDKs,
  plus older Xcode 26 installations. The job's actual evidence takes precedence.

## Primary references

- [SceneKit](https://developer.apple.com/documentation/scenekit)
  ([machine readable availability](https://developer.apple.com/tutorials/data/documentation/scenekit.json))
- [RealityKit](https://developer.apple.com/documentation/realitykit)
  ([machine readable availability](https://developer.apple.com/tutorials/data/documentation/realitykit.json))
- [Metal](https://developer.apple.com/documentation/metal)
- [Bring your game to Apple TV](https://developer.apple.com/videos/play/wwdc2025/287/)
- [GitHub hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [macOS 26 image software](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md)

Physical Apple TV compatibility, controller recognition, thermal behaviour and
frame rates require later testing on real hardware. No signing or distribution
is performed by this workflow.

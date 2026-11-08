# Actual native simulator evidence

Source: `9df6a2761e41182dfad9a90d330f13ae3eae7cd6`.
Run: https://github.com/thundercato/bunker-game/actions/runs/42310250562
Both native simulator jobs passed all 14 tests and separately launched these apps.
These are actual SceneKit/SwiftUI simulator captures, not artwork or physical-device
screenshots. Full-resolution PNGs and UI attachments remain in the CI artifacts.

- [iPad landscape preview](ipad-landscape.jpg): same raw JPEG scan data with only
  EXIF orientation 8 added, to display the landscape UI upright. CoreSimulator's
  raw framebuffer stays portrait after the automated device rotation. Viewers
  ignoring EXIF will display it sideways; no scene content/pixels were edited.
- [Exact iPad raw framebuffer JPEG](ipad-raw-framebuffer.jpg), extracted from CI logs.
- [Apple TV native scene](tv-launch.jpg), extracted unchanged from CI logs.

The smaller JPEG previews were created by macOS `sips` from actual `simctl`
screenshots and emitted between marked log lines, because this cloud proxy rejected
Actions' Azure artifact download redirects. This method preserves reviewable actual
output while full PNG/xcresult/app bundles remain normal Actions artifacts.

| File | SHA-256 |
| --- | --- |
| ipad-raw-framebuffer.jpg | afc6d1b904f4c9a76095862b474e7f0b889a8fe15fa57891a92124fd02cc00f7 |
| ipad-landscape.jpg | 3b8cd618b5f3a61e494e84ee47960cf4fd7aa67cbacad88581556dbd11157187 |
| tv-launch.jpg | 95d631bcf9ed6f3a01d16f2b497f5e98823227fba48dd0da69fa8438bc71086f |

Asset authors/licences are retained in `native/apple/NativeContent/provenance.json`
and `Licences/`; these screenshots reuse only that pinned source subset.

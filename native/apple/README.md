# Field Signal — native Apple experiment

This is a separate, unsigned, non-AR Swift prototype. SwiftUI presents the HUD and
menus; SceneKit renders a real first-person 3D scene. It does not load the website
or run Pyodide. The browser game and World Editor remain the content source of
truth and are not changed by this experiment.

The scene uses the existing Forester’s cottage and its authored world layout:
outdoor approach, furnished ground floor, opening door, stairwell and upper floor.
One exported scene supplies rendered pieces, collision and stable interaction IDs.
The export pins source revision `25cd697be9d68a88fe8b66b5cfbcee268c565d6d`.
See the generated provenance manifest for exact mesh sources and modifications.

## Reproduce

From the repository root, follow
[BUILD_AND_TEST.md](../../docs/native-apple/BUILD_AND_TEST.md). Project generation
uses Python’s standard library; world compilation uses the repository’s existing
Node modules. No signing identity, developer account or paid service is required
for simulator builds. Generated resources and the Xcode project are checked in so
Xcode can open the project directly.

## Play the slice

On iPad, drag the left circular pad to move and the right half of the screen to
look. Walk along the path towards the cottage, then use the labelled action to
open its door. Search a cupboard, then
interact again to collect its supplies. The Inventory button opens the native
pack, and Torch toggles the camera-mounted spotlight. Go through the inner door,
return to the entrance hall and climb the stairs on the right to the upper floor.
The copper coil on the table is a collectable native fixture.

With an extended gamepad, left stick moves, right stick looks, A interacts,
X toggles the torch and Y opens inventory. Menu/Back opens or closes native menus;
focused menu buttons use the platform's native activation. Apple TV exploration
requires a gamepad; the simulated remote tests only establish menu navigation.
Disconnecting a controller or backgrounding the app pauses the session.

Pause and choose **Save native checkpoint** to keep this experiment's position,
doors and collected inventory. The next launch continues that separate checkpoint.
UI tests use `--uitesting` to start a fresh session without loading or writing it.
These checkpoint rules are specific to the experiment; they do not implement or
replace the future browser campaign save design.

## Scope

This is a playable technology experiment, not a port of the full survival engine.
Its inventory and persistence are native-only. There are no campaign migrations,
mission changes, save-schema changes or deployment changes. Asset licensing is
retained alongside the converted subset. No performance improvement over the
browser game is claimed without equivalent physical-device measurements.

[Framework decision](FRAMEWORK_DECISION.md) explains the bounded use of SceneKit
and its deprecation. [Progress](../../docs/native-apple/PROGRESS.md) records actual
build/test evidence. [Mac handoff](../../docs/native-apple/MAC_HANDOFF.md) continues
this branch later with Codex Local; do not start a replacement project.

# Field Signal World Editor v1

Open `/bunker-game/editor/` on a desktop browser, preferably Safari or Chrome on a Mac. The editor uses the same Three.js models and building specifications as the game, but runs independently of your normal saved campaign.

## Working on a building
Select one of the 37 exterior buildings. Use the left hierarchy to choose a wall, door opening, staircase, floor, loot container, furniture item or light. Use **W** to move, **E** to rotate, **R** to scale; the inspector also allows precise positions and dimensions. Orbit the view with the mouse, use the orthographic plan, hide the roof, toggle collisions and show floors separately. Grid snapping, selection locking, duplication, undo and redo are supported.

## Saving and testing
The editor stores unfinished drafts in browser storage under keys separate from gameplay. Download a portable `field-signal-layout/1` JSON through Export. Reimport that same JSON on any desktop with the editor. **Test in game** opens an isolated local preview with the edited building, the real physics and interaction bindings, and a separate temporary campaign. It does not edit or overwrite your actual game progress. Exported JSON is not automatically published to other players.

## Important structural rules
Floor openings regenerate when you move or rotate a staircase. Existing mission containers and doors may be moved, but cannot be deleted. The game physics and collision and the editor agree on wall, doorway and staircase geometry. Validation identifies possible gaps, floating furniture, missing upper-floor connections and blocked starts. Building footprint, global position and number of floors are fixed in editor v1.

## Applying a level permanently
Export the JSON and commit it to the game's `site/levels/` directory through the normal reviewed GitHub workflow. The game loader can be extended to select published layouts from that directory in the next stage. For v1, the primary delivery is visual design and faithful temporary play-testing. **The public game continues using the approved v11 layouts unless a change is separately published.**

## Mac details
No separate Mac application, Python installation, account token or native compiler is required when using the published HTTPS site. Use Cmd+S to download/export, Cmd+Z to undo and Cmd+Shift+Z to redo. Large asset loading may take a while on first launch. The editor is designed for mouse and keyboard, not a phone.

## Limits and safety
Import validates IDs, finite coordinates and permitted asset names before any file can affect the editor. It cannot execute scripts from imported JSON. Keep separate backups of edits. No claim of physical Mac Safari testing is made from the automated Chromium browser tests.

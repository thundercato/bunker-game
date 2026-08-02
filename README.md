# Bunker Game

A modular browser game built with Phaser 3, TypeScript and Vite for long-term AI-assisted development.

## Current release: v0.0.01

The first release is a joypad diagnostic. It uses the browser Gamepad API to show:

- connected controller name and mapping
- live analogue-axis values
- every reported button and analogue trigger value
- a clear input-detected status

No gameplay has been added yet.

## Play

Open the GitHub Pages build on the phone, connect the controller, then press a button. iPhone browsers may not expose a connected controller until the first button press.

Expected address:

`https://thundercato.github.io/bunker-game/`

## Development

```bash
npm install
npm run dev
```

Every push to `main` validates and deploys the latest build automatically.

## Architecture

- `src/input`: browser input boundary and immutable controller snapshots
- `src/scenes`: thin Phaser lifecycle and presentation adapters
- `src/core`: typed cross-module infrastructure
- future gameplay, UI, audio, save and rendering systems remain independent modules

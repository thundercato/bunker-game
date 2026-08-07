# Bunker Game

A modular browser survival game built with Phaser 3, TypeScript and Vite for long-term AI-assisted development.

## Current release: v0.0.0.15

The current development build includes the bunker, procedural labyrinth exploration, persistent side rooms, survival needs, inventory, firearms, knife combat and touch, keyboard and gamepad controls.

## Play

Open the GitHub Pages build in a landscape browser or install it to the iPhone or iPad Home Screen:

`https://thundercato.github.io/bunker-game/`

## Development

```bash
npm install
npm run dev
```

Every push to `main` validates and deploys the latest build automatically.

## Architecture

- `src/input`: keyboard, gamepad and touchscreen input
- `src/scenes`: Phaser world, room and gameplay scenes
- `src/labyrinth`: deterministic procedural generation and validation
- `src/inventory`: persistent inventory state
- `src/systems`: survival and consumable systems
- `src/camera`: reusable room camera calculations
- `src/pwa`: update and cache management
- `src/core`: typed cross-module infrastructure

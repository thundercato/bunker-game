# Bunker Game

A modular browser survival game rebuilt in Godot 4 for landscape iPhone, iPad, keyboard and gamepad play. The previous Phaser implementation remains available as a fallback.

## Current release: Godot v0.0.0.3

The current development build includes the complete bunker, hybrid room camera, procedural labyrinth exploration, persistent side rooms, survival needs, inventory, physical firearm and knife state, maintenance, food, water, sleep, combat and touch, keyboard and gamepad controls.

## Play

Open the GitHub Pages build in a landscape browser or install it to the iPhone or iPad Home Screen:

`https://thundercato.github.io/bunker-game/`

The preserved Phaser `0.0.0.16` release is available at:

`https://thundercato.github.io/bunker-game/phaser-legacy/`

## Development

```bash
npm install
npm run dev
```

Every gameplay push to `main` validates the Phaser fallback, exports Godot and deploys the combined site automatically.

## Godot architecture

- `godot/main.gd`: game coordinator, rendering, world interactions and UI
- `godot/systems`: save state and physical inventory/weapon rules
- `godot/world`: deterministic maze and room generation
- `godot/ui`: touch joystick and Safari-safe lighting shader

## Preserved Phaser architecture

- `src/input`: keyboard, gamepad and touchscreen input
- `src/scenes`: Phaser world, room and gameplay scenes
- `src/labyrinth`: deterministic procedural generation and validation
- `src/inventory`: persistent inventory state
- `src/systems`: survival and consumable systems
- `src/camera`: reusable room camera calculations
- `src/pwa`: update and cache management
- `src/core`: typed cross-module infrastructure

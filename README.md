# Bunker Game

A modular browser survival game rebuilt in Godot 4 for landscape iPhone, iPad, keyboard and gamepad play. The previous Phaser implementation remains available as a fallback.

## Current release: Godot v0.0.0.4

The current development build adds a cohesive, crisp pixel-art presentation to the complete bunker, hybrid room camera, procedural labyrinth exploration, persistent side rooms, survival needs, inventory, physical firearm and knife state, maintenance, food, water, sleep, combat and touch, keyboard and gamepad controls.

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

- `godot/main.gd`: game coordinator and world interactions
- `godot/systems`: save state and physical inventory/weapon rules
- `godot/world`: deterministic maze and room generation
- `godot/visual`: pixel atlas access and world/entity presentation
- `godot/ui`: pixel HUD/theme, touch controls, transitions and Safari-safe lighting
- `godot/assets`: generated game-ready pixel atlases, bitmap font and start presentation

## Preserved Phaser architecture

- `src/input`: keyboard, gamepad and touchscreen input
- `src/scenes`: Phaser world, room and gameplay scenes
- `src/labyrinth`: deterministic procedural generation and validation
- `src/inventory`: persistent inventory state
- `src/systems`: survival and consumable systems
- `src/camera`: reusable room camera calculations
- `src/pwa`: update and cache management
- `src/core`: typed cross-module infrastructure

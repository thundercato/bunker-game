import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");
const oldPosition = `    const bounds = this.physics.world.bounds;\n    const x = bounds.centerX;\n    const y = bounds.bottom - 42;`;
const newPosition = `    // Keep the entrance on the walkable side of the lower passage's end wall.\n    // These bounds match the map's LOWER PASSAGE zone, so the player can\n    // physically reach the interaction radius without crossing collision.\n    const lowerPassage = new Phaser.Geom.Rectangle(800, 416, 288, 576);\n    const x = lowerPassage.centerX;\n    const y = lowerPassage.bottom - 64;`;
if (scene.includes(oldPosition)) scene = scene.replace(oldPosition, newPosition);
await writeFile(scenePath, scene, "utf8");

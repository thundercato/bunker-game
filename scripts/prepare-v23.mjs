import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

if (!scene.includes("const BUNKER_TILE_SIZE = 32;")) {
  scene = scene.replace(
    "const EXIT_RANGE = 70;",
    "const EXIT_RANGE = 70;\nconst BUNKER_TILE_SIZE = 32;\nconst LOWER_PASSAGE_BOUNDS = new Phaser.Geom.Rectangle(800, 416, 288, 576);",
  );
}

scene = scene.replace(
  "    const bounds = this.physics.world.bounds;\n    const x = bounds.centerX;\n    const y = bounds.bottom - 42;",
  "    const x = LOWER_PASSAGE_BOUNDS.centerX;\n    const y = LOWER_PASSAGE_BOUNDS.bottom - BUNKER_TILE_SIZE * 1.5;",
);

await writeFile(scenePath, scene, "utf8");

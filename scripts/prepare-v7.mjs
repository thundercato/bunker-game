import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV7Scene.ts", import.meta.url);
let sceneSource = await readFile(scenePath, "utf8");

sceneSource = sceneSource
  .replaceAll("this.gamepad()", "this.currentGamepad()")
  .replace(
    "private gamepad(): Gamepad | null",
    "private currentGamepad(): Gamepad | null",
  )
  .replace("  private knifeStuck = false;\n", "")
  .replaceAll("    this.knifeStuck = true;\n", "")
  .replaceAll("    this.knifeStuck = false;\n", "");

await writeFile(scenePath, sceneSource, "utf8");

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV6Scene } from "@/scenes/BunkerV6Scene";',
    'import { BunkerV8Scene } from "@/scenes/BunkerV8Scene";',
  )
  .replace("scene: [BunkerV6Scene]", "scene: [BunkerV8Scene]")
  .replace('const VERSION = "0.6.00";', 'const VERSION = "0.8.00";');
await writeFile(mainPath, mainSource, "utf8");

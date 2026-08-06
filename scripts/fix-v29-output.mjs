import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV29Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

scene = scene
  .replaceAll("activeRoom", "activeExplorationRoom")
  .replaceAll("makePrompt", "makeV29Prompt")
  .replace("  private activeDoor?: ExplorationDoor;\n", "")
  .replace("    this.activeDoor = door;\n", "");

await writeFile(scenePath, scene, "utf8");

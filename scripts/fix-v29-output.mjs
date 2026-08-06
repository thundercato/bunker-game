import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV29Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

scene = scene
  .replaceAll("activeRoom", "activeExplorationRoom")
  .replaceAll("activeDoor", "activeExplorationDoor")
  .replaceAll("makePrompt", "makeV29Prompt")
  .replace(
    "    this.activeExplorationDoor = door;\n",
    "    this.activeExplorationDoor = door;\n    this.returnPosition.setLength(this.returnPosition.length());\n",
  );

await writeFile(scenePath, scene, "utf8");

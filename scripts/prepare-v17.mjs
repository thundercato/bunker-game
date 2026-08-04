import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV16Scene } from "@/scenes/BunkerV16Scene";',
    'import { BunkerV17Scene } from "@/scenes/BunkerV17Scene";',
  )
  .replace("scene: [BunkerV16Scene]", "scene: [BunkerV17Scene]")
  .replace('const VERSION = "0.1.0.10";', 'const VERSION = "0.1.0.12";');
await writeFile(mainPath, mainSource, "utf8");

const v16Path = new URL("../src/scenes/BunkerV16Scene.ts", import.meta.url);
let v16Source = await readFile(v16Path, "utf8");
v16Source = v16Source
  .replace(
    "this.cachedStorageItems = detail.items.map((item) => ({ ...item }));",
    "this.cachedStorageItems = detail.items;",
  )
  .replace(
    'if (label === "TAKE" && panel) {\n      window.setTimeout(',
    'if (label === "TAKE" && panel) {\n      const title = panel.querySelector("h2")?.textContent?.trim();\n      const baseItem = this.cachedStorageItems.find((item) => item.name === title);\n      if (baseItem) baseItem.taken = true;\n      window.setTimeout(',
  );
await writeFile(v16Path, v16Source, "utf8");

const scenePath = new URL("../src/scenes/BunkerV17Scene.ts", import.meta.url);
let sceneSource = await readFile(scenePath, "utf8");
sceneSource = sceneSource
  .replaceAll("private observer?", "private survivalObserver?")
  .replaceAll("this.observer", "this.survivalObserver")
  .replaceAll("this.findPlayer()", "this.findPlayerV17()")
  .replace("private findPlayer():", "private findPlayerV17():")
  .replaceAll("this.toast(", "this.toastV17(")
  .replace(
    "private toast(message: string):",
    "private toastV17(message: string):",
  );
await writeFile(scenePath, sceneSource, "utf8");

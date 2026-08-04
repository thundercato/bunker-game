import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV15Scene } from "@/scenes/BunkerV15Scene";',
    'import { BunkerV16Scene } from "@/scenes/BunkerV16Scene";',
  )
  .replace("scene: [BunkerV15Scene]", "scene: [BunkerV16Scene]")
  .replace('const VERSION = "0.1.0.9";', 'const VERSION = "0.1.0.10";');
await writeFile(mainPath, mainSource, "utf8");

const scenePath = new URL("../src/scenes/BunkerV16Scene.ts", import.meta.url);
let sceneSource = await readFile(scenePath, "utf8");
sceneSource = sceneSource
  .replace("private runtime(): Runtime", "private runtimeV16(): Runtime")
  .replaceAll("this.runtime()", "this.runtimeV16()")
  .replace(
    "private updateVersionLabel(): void",
    "private updateVersionLabelV16(): void",
  )
  .replaceAll("this.updateVersionLabel()", "this.updateVersionLabelV16()")
  .replace("private installStyles(): void", "private installStylesV16(): void")
  .replaceAll("this.installStyles()", "this.installStylesV16()")
  .replace("private toast(message: string): void", "private toastV16(message: string): void")
  .replaceAll("this.toast(", "this.toastV16(");
await writeFile(scenePath, sceneSource, "utf8");

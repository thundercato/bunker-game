import { readFile, writeFile } from "node:fs/promises";

const v9Path = new URL("../src/scenes/BunkerV9Scene.ts", import.meta.url);
let v9Source = await readFile(v9Path, "utf8");
v9Source = v9Source
  .replaceAll("this.backpackButton", "this.v9BackpackButton")
  .replace(
    "private backpackButton!: HTMLElement;",
    "private v9BackpackButton!: HTMLElement;",
  )
  .replaceAll("this.requireElement", "this.requireV9Element")
  .replace(
    "private requireElement(selector: string): HTMLElement",
    "private requireV9Element(selector: string): HTMLElement",
  )
  .replaceAll("this.overlay", "this.v9Overlay")
  .replace("private overlay!: HTMLElement;", "private v9Overlay!: HTMLElement;")
  .replaceAll("this.controls", "this.v9Controls")
  .replace("private controls!: HTMLElement;", "private v9Controls!: HTMLElement;");
await writeFile(v9Path, v9Source, "utf8");

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV8Scene } from "@/scenes/BunkerV8Scene";',
    'import { BunkerV9Scene } from "@/scenes/BunkerV9Scene";',
  )
  .replace(
    'import { BunkerV6Scene } from "@/scenes/BunkerV6Scene";',
    'import { BunkerV9Scene } from "@/scenes/BunkerV9Scene";',
  )
  .replace("scene: [BunkerV8Scene]", "scene: [BunkerV9Scene]")
  .replace("scene: [BunkerV6Scene]", "scene: [BunkerV9Scene]")
  .replace('const VERSION = "0.8.10";', 'const VERSION = "0.1.0.2";')
  .replace('const VERSION = "0.6.00";', 'const VERSION = "0.1.0.2";');
await writeFile(mainPath, mainSource, "utf8");

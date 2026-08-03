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
  .replace(
    "private controls!: HTMLElement;",
    "private v9Controls!: HTMLElement;",
  )
  .replaceAll("this.updateVersionLabels", "this.updateV9VersionLabels")
  .replace(
    "private updateVersionLabels(): void",
    "private updateV9VersionLabels(): void",
  )
  .replaceAll("this.captureStorage", "this.captureV9Storage")
  .replace(
    "private readonly captureStorage",
    "private readonly captureV9Storage",
  )
  .replaceAll("this.setUiOpen", "this.setV9UiOpen")
  .replace(
    "private setUiOpen(open: boolean): void",
    "private setV9UiOpen(open: boolean): void",
  )
  .replaceAll("this.closeUi", "this.closeV9Ui")
  .replace("private closeUi", "private closeV9Ui")
  .replaceAll("this.openStorage", "this.openV9Storage")
  .replace("private openStorage(", "private openV9Storage(")
  .replaceAll("this.openBackpack", "this.openV9Backpack")
  .replace("private openBackpack(): void", "private openV9Backpack(): void");
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

import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../src/scenes/BunkerV7Scene.ts", import.meta.url);
let source = await readFile(path, "utf8");

source = source
  .replaceAll("this.gamepad()", "this.currentGamepad()")
  .replace("private gamepad(): Gamepad | null", "private currentGamepad(): Gamepad | null")
  .replace("  private knifeStuck = false;\n", "")
  .replaceAll("    this.knifeStuck = true;\n", "")
  .replaceAll("    this.knifeStuck = false;\n", "");

await writeFile(path, source, "utf8");

import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let main = await readFile(mainPath, "utf8");
main = main
  .replace(
    /import \{ BunkerV\d+Scene \} from "@\/scenes\/BunkerV\d+Scene";/,
    'import { BunkerV19Scene } from "@/scenes/BunkerV19Scene";',
  )
  .replace(/scene: \[BunkerV\d+Scene\]/, "scene: [BunkerV19Scene]");
await writeFile(mainPath, main, "utf8");

const tunnelPath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let tunnel = await readFile(tunnelPath, "utf8");
tunnel = tunnel
  .replace("const WALL = 18;\n", "")
  .replaceAll("this.player", "this.tunnelPlayer")
  .replace("private player?:", "private tunnelPlayer?:")
  .replace("{ x: 0, y: 0, add: false }", "{ x: 0, y: 0 }")
  .replace(
    "  private updateEnemies(time: number, _delta: number): void {",
    "  private updateEnemies(time: number, delta: number): void {\n    void delta;",
  );
await writeFile(tunnelPath, tunnel, "utf8");

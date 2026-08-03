import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV11Scene } from "@/scenes/BunkerV11Scene";',
    'import { BunkerV12Scene } from "@/scenes/BunkerV12Scene";',
  )
  .replace(
    'import { BunkerV10Scene } from "@/scenes/BunkerV10Scene";',
    'import { BunkerV12Scene } from "@/scenes/BunkerV12Scene";',
  )
  .replace("scene: [BunkerV11Scene]", "scene: [BunkerV12Scene]")
  .replace("scene: [BunkerV10Scene]", "scene: [BunkerV12Scene]")
  .replace('const VERSION = "0.1.0.4";', 'const VERSION = "0.1.0.5";')
  .replace('const VERSION = "0.1.0.3";', 'const VERSION = "0.1.0.5";');
await writeFile(mainPath, mainSource, "utf8");

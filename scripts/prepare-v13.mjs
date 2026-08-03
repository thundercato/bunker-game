import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV12Scene } from "@/scenes/BunkerV12Scene";',
    'import { BunkerV13Scene } from "@/scenes/BunkerV13Scene";',
  )
  .replace(
    'import { BunkerV11Scene } from "@/scenes/BunkerV11Scene";',
    'import { BunkerV13Scene } from "@/scenes/BunkerV13Scene";',
  )
  .replace("scene: [BunkerV12Scene]", "scene: [BunkerV13Scene]")
  .replace("scene: [BunkerV11Scene]", "scene: [BunkerV13Scene]")
  .replace('const VERSION = "0.1.0.5";', 'const VERSION = "0.1.0.6";')
  .replace('const VERSION = "0.1.0.4";', 'const VERSION = "0.1.0.6";');
await writeFile(mainPath, mainSource, "utf8");

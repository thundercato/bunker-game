import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV14Scene } from "@/scenes/BunkerV14Scene";',
    'import { BunkerV15Scene } from "@/scenes/BunkerV15Scene";',
  )
  .replace("scene: [BunkerV14Scene]", "scene: [BunkerV15Scene]")
  .replace('const VERSION = "0.1.0.8";', 'const VERSION = "0.1.0.9";');
await writeFile(mainPath, mainSource, "utf8");

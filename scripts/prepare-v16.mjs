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

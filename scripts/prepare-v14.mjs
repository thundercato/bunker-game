import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV13Scene } from "@/scenes/BunkerV13Scene";',
    'import { BunkerV14Scene } from "@/scenes/BunkerV14Scene";',
  )
  .replace("scene: [BunkerV13Scene]", "scene: [BunkerV14Scene]")
  .replace('const VERSION = "0.1.0.7";', 'const VERSION = "0.1.0.8";')
  .replace('const VERSION = "0.1.0.6";', 'const VERSION = "0.1.0.8";');
await writeFile(mainPath, mainSource, "utf8");

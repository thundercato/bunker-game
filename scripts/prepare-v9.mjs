import { readFile, writeFile } from "node:fs/promises";

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

import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let mainSource = await readFile(mainPath, "utf8");
mainSource = mainSource
  .replace(
    'import { BunkerV10Scene } from "@/scenes/BunkerV10Scene";',
    'import { BunkerV11Scene } from "@/scenes/BunkerV11Scene";',
  )
  .replace(
    'import { BunkerV9Scene } from "@/scenes/BunkerV9Scene";',
    'import { BunkerV11Scene } from "@/scenes/BunkerV11Scene";',
  )
  .replace(
    'import { BunkerV6Scene } from "@/scenes/BunkerV6Scene";',
    'import { BunkerV11Scene } from "@/scenes/BunkerV11Scene";',
  )
  .replace("scene: [BunkerV10Scene]", "scene: [BunkerV11Scene]")
  .replace("scene: [BunkerV9Scene]", "scene: [BunkerV11Scene]")
  .replace("scene: [BunkerV6Scene]", "scene: [BunkerV11Scene]")
  .replace('const VERSION = "0.1.0.3";', 'const VERSION = "0.1.0.4";')
  .replace('const VERSION = "0.1.0.2";', 'const VERSION = "0.1.0.4";')
  .replace('const VERSION = "0.6.00";', 'const VERSION = "0.1.0.4";');
await writeFile(mainPath, mainSource, "utf8");

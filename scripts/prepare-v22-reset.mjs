import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let main = await readFile(mainPath, "utf8");
main = main
  .replace(
    'import { BunkerV19Scene } from "@/scenes/BunkerV19Scene";',
    'import { BunkerV6Scene } from "@/scenes/BunkerV6Scene";',
  )
  .replace("scene: [BunkerV19Scene]", "scene: [BunkerV6Scene]");
await writeFile(mainPath, main, "utf8");

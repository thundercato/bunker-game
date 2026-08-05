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

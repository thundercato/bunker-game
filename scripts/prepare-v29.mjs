import { readFile, writeFile } from "node:fs/promises";

const mainPath = new URL("../src/main.ts", import.meta.url);
let main = await readFile(mainPath, "utf8");

main = main
  .replace(
    /import \{ BunkerV\d+Scene \} from "@\/scenes\/BunkerV\d+Scene";/,
    'import { BunkerV29Scene } from "@/scenes/BunkerV29Scene";',
  )
  .replace(/scene: \[BunkerV\d+Scene\]/, "scene: [BunkerV29Scene]");

if (!main.includes("scene: [BunkerV29Scene]")) {
  throw new Error("prepare-v29: failed to select BunkerV29Scene");
}

await writeFile(mainPath, main, "utf8");

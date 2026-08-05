import { readFile, writeFile } from "node:fs/promises";
const path = new URL("./prepare-v21.mjs", import.meta.url);
const source = await readFile(path, "utf8");
await writeFile(
  path,
  source.replace(
    'const marker = "  private findPlayer():";',
    'const marker = "  private findPlayer";',
  ),
  "utf8",
);

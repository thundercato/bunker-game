import { readFile, writeFile } from "node:fs/promises";

const v9Path = new URL("../src/scenes/BunkerV9Scene.ts", import.meta.url);
let v9 = await readFile(v9Path, "utf8");
v9 = v9.replaceAll("this.openBaseItem(", "this.openV9BaseItem(");
await writeFile(v9Path, v9, "utf8");

const v17Path = new URL("../src/scenes/BunkerV17Scene.ts", import.meta.url);
let v17 = await readFile(v17Path, "utf8");
v17 = v17
  .replaceAll(
    "inBackpack = true,\n  ): Promise<void> {\n    const runtime = this.runtimeV17();",
    "inBackpack = true,\n  ): Promise<void> {\n    void inBackpack;\n    const runtime = this.runtimeV17();",
  )
  .replaceAll(
    "inBackpack = true): Promise<void> {\n    const runtime = this.runtimeV17();",
    "inBackpack = true): Promise<void> {\n    void inBackpack;\n    const runtime = this.runtimeV17();",
  );
await writeFile(v17Path, v17, "utf8");

import { readFile, writeFile } from "node:fs/promises";

const replaceRequired = (source, from, to, label) => {
  if (!source.includes(from)) throw new Error(`prepare-v18: missing ${label}`);
  return source.replace(from, to);
};

const mainPath = new URL("../src/main.ts", import.meta.url);
let main = await readFile(mainPath, "utf8");
if (!main.includes("BunkerV18Scene")) {
  main = replaceRequired(
    main,
    'import { BunkerV17Scene } from "@/scenes/BunkerV17Scene";',
    'import { BunkerV18Scene } from "@/scenes/BunkerV18Scene";',
    "current scene import",
  );
  main = replaceRequired(
    main,
    "scene: [BunkerV17Scene]",
    "scene: [BunkerV18Scene]",
    "scene registration",
  );
  await writeFile(mainPath, main, "utf8");
}

const v9Path = new URL("../src/scenes/BunkerV9Scene.ts", import.meta.url);
let v9 = await readFile(v9Path, "utf8");
if (!v9.includes("storageInventory = new InventoryStore")) {
  v9 = replaceRequired(
    v9,
    'import Phaser from "phaser";',
    'import Phaser from "phaser";\nimport { InventoryStore } from "@/inventory/InventoryStore";',
    "inventory store import",
  );
  v9 = replaceRequired(
    v9,
    "  private fireHeld = false;",
    "  private fireHeld = false;\n  private readonly storageInventory = new InventoryStore<BaseItem>((item) => item.id);",
    "inventory store field",
  );
  v9 = replaceRequired(
    v9,
    "    const items = (\n      event as CustomEvent<{ items: BaseItem[] }>\n    ).detail.items.map((item) => ({ ...item }));",
    "    const items = (event as CustomEvent<{ items: BaseItem[] }>).detail.items;\n    this.storageInventory.replace(items);",
    "storage event capture",
  );

  const rendererPattern = / {2}private openV9Storage\(\s*baseItems: BaseItem\[\],?\s*\): void \{\s*this\.setV9UiOpen\(true\);/;
  if (!rendererPattern.test(v9)) {
    throw new Error("prepare-v18: missing storage renderer signature");
  }
  v9 = v9.replace(
    rendererPattern,
    "  private openV9Storage(baseItems?: BaseItem[]): void {\n    if (baseItems) this.storageInventory.replace(baseItems);\n    const currentItems = this.storageInventory.values();\n    this.setV9UiOpen(true);",
  );
  v9 = replaceRequired(
    v9,
    "...baseItems.filter((item) => !item.taken),",
    "...currentItems.filter((item) => !item.taken),",
    "storage live collection",
  );
  v9 = replaceRequired(
    v9,
    "          this.runtimeV9().backpack.set(item.id, item);\n          this.openV9Backpack();",
    "          this.runtimeV9().backpack.set(item.id, item);\n          this.storageInventory.upsert(item);\n          this.openV9Storage();",
    "base item take destination",
  );
  v9 = v9.replaceAll("this.openV9Storage([])", "this.openV9Storage()");
  v9 = replaceRequired(
    v9,
    "          item.location = \"backpack\";\n          this.openV9Backpack();",
    "          item.location = \"backpack\";\n          this.openV9Storage();",
    "firearm take destination",
  );
  await writeFile(v9Path, v9, "utf8");
}

const v16Path = new URL("../src/scenes/BunkerV16Scene.ts", import.meta.url);
let v16 = await readFile(v16Path, "utf8");
if (v16.includes("cachedStorageItems")) {
  v16 = v16.replace("  private cachedStorageItems: BaseItem[] = [];\n", "");
  v16 = v16.replace(
    '    window.addEventListener("bunker-storage-open", this.cacheStorage, true);\n',
    "",
  );
  v16 = v16.replace(
    '      window.removeEventListener(\n        "bunker-storage-open",\n        this.cacheStorage,\n        true,\n      );\n',
    "",
  );
  v16 = v16.replace(
    /\n {2}private readonly cacheStorage = \(event: Event\): void => \{[\s\S]*?\n {2}\};\n/,
    "\n",
  );
  v16 = v16.replace(
    /\n {4}const label = target\.textContent\?\.trim\(\) \?\? "";\n {4}const panel = target\.closest<HTMLElement>\([\s\S]*?\n {4}\);/,
    "",
  );
  v16 = v16.replace(
    /\n {4}if \(label === "TAKE" && panel\) \{[\s\S]*?\n {4}\}/,
    "",
  );
  await writeFile(v16Path, v16, "utf8");
}

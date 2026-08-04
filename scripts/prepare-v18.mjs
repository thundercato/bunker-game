import { readFile, writeFile } from "node:fs/promises";

const replaceRequired = (source, from, to, label) => {
  if (!source.includes(from)) throw new Error(`prepare-v18: missing ${label}`);
  return source.replace(from, to);
};

const mainPath = new URL("../src/main.ts", import.meta.url);
let main = await readFile(mainPath, "utf8");
if (main.includes("BunkerV18Scene")) process.exit(0);
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

const v9Path = new URL("../src/scenes/BunkerV9Scene.ts", import.meta.url);
let v9 = await readFile(v9Path, "utf8");
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
v9 = replaceRequired(
  v9,
  "  private openStorage(baseItems: BaseItem[]): void {\n    this.setUiOpen(true);",
  "  private openStorage(baseItems?: BaseItem[]): void {\n    if (baseItems) this.storageInventory.replace(baseItems);\n    const currentItems = this.storageInventory.values();\n    this.setUiOpen(true);",
  "storage renderer signature",
);
v9 = replaceRequired(
  v9,
  "...baseItems.filter((item) => !item.taken),",
  "...currentItems.filter((item) => !item.taken),",
  "storage live collection",
);
v9 = replaceRequired(
  v9,
  "          this.runtimeV9().backpack.set(item.id, item);\n          this.openBackpack();",
  "          this.runtimeV9().backpack.set(item.id, item);\n          this.storageInventory.upsert(item);\n          this.openStorage();",
  "base item take destination",
);
v9 = replaceRequired(
  v9,
  "        item.taken ? this.openBackpack() : this.openStorage([]),",
  "        item.taken ? this.openBackpack() : this.openStorage(),",
  "base item back destination",
);
v9 = replaceRequired(
  v9,
  "          item.location = \"backpack\";\n          this.openBackpack();",
  "          item.location = \"backpack\";\n          this.openStorage();",
  "firearm take destination",
);
v9 = replaceRequired(
  v9,
  "        origin === \"storage\" ? this.openStorage([]) : this.openBackpack(),",
  "        origin === \"storage\" ? this.openStorage() : this.openBackpack(),",
  "firearm back destination",
);
await writeFile(v9Path, v9, "utf8");

const v16Path = new URL("../src/scenes/BunkerV16Scene.ts", import.meta.url);
let v16 = await readFile(v16Path, "utf8");
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
  /\n {4}if \(label === "TAKE" && panel\) \{[\s\S]*?\n {4}\}/,
  "",
);
await writeFile(v16Path, v16, "utf8");

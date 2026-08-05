import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../src/systems/ConsumableSystem.ts", import.meta.url);
let source = await readFile(path, "utf8");
if (!source.includes("servingsPerItem?: number")) {
  source = source.replace(
    "  calories: number;\n};",
    "  calories: number;\n  servingsPerItem?: number;\n};",
  );
  const servings = new Map([
    ["TIN OF BEANS", 2],
    ["CHOCOLATE", 4],
    ["APPLE", 2],
    ["MILITARY RATION PACK", 4],
    ["RATION CRACKERS", 2],
    ["TINNED PEACHES", 2],
    ["TIN OF SOUP", 2],
    ["BEEF JERKY", 3],
  ]);
  for (const [name, count] of servings) {
    const nameToken = `    name: "${name}",`;
    const start = source.indexOf(nameToken);
    if (start < 0) throw new Error(`prepare-v21 consumable missing ${name}`);
    const calories = source.indexOf("    calories:", start);
    const lineEnd = source.indexOf("\n", calories);
    source = `${source.slice(0, lineEnd + 1)}    servingsPerItem: ${count},\n${source.slice(lineEnd + 1)}`;
  }
}
if (!source.includes("public consumeServing")) {
  const marker = "  public setFlaskFill(";
  const method = `  public consumeServing(id: string, servingsPerItem = 1): boolean {
    const state = this.get(id);
    if (state.quantity <= 0) return false;
    const portion = 1 / Math.max(1, servingsPerItem);
    state.quantity = Math.max(0, Number((state.quantity - portion).toFixed(4)));
    this.set(id, state);
    return true;
  }

`;
  if (!source.includes(marker)) throw new Error("prepare-v21 missing flask marker");
  source = source.replace(marker, `${method}${marker}`);
}
await writeFile(path, source, "utf8");

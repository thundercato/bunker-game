import { readFile, writeFile } from "node:fs/promises";

function replaceMethod(source, starts, ends, replacement, label) {
  const startToken = starts.find((token) => source.includes(token));
  if (!startToken) throw new Error(`prepare-v20 missing ${label} start`);
  const start = source.indexOf(startToken);
  const endToken = ends.find((token) => source.indexOf(token, start + startToken.length) >= 0);
  if (!endToken) throw new Error(`prepare-v20 missing ${label} end`);
  const end = source.indexOf(endToken, start + startToken.length);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

const v9Path = new URL("../src/scenes/BunkerV9Scene.ts", import.meta.url);
let v9 = await readFile(v9Path, "utf8");
if (!v9.includes("carriedEntries = [")) {
  v9 = replaceMethod(
    v9,
    ["  private openV9Backpack(): void {", "  private openBackpack(): void {"],
    ["  private openV9BaseItem(", "  private openBaseItem("],
    `  private openV9Backpack(): void {
    this.setV9UiOpen(true);
    const panel = document.createElement("div");
    panel.className = "backpack-panel firearm-inventory";
    panel.innerHTML = \`<header><h2>BACKPACK</h2><p>3 × 4 carried inventory</p></header><div class="backpack-grid storage-grid"></div><button class="overlay-back">BACK</button>\`;
    const grid = panel.querySelector<HTMLElement>(".backpack-grid");
    if (!grid) throw new Error("Backpack grid missing");

    const carriedEntries = [
      ...Array.from(this.runtimeV9().backpack.values()).map((item) => ({
        type: "base" as const,
        item,
      })),
      ...Array.from(this.firearmItems.values())
        .filter((item) => item.location === "backpack" && (item.kind !== "ammo" || item.rounds > 0))
        .map((item) => ({ type: "firearm" as const, item })),
    ];

    for (let slot = 0; slot < 12; slot += 1) {
      const cell = document.createElement("button");
      cell.className = "storage-cell";
      const entry = carriedEntries[slot];
      cell.disabled = !entry;
      if (entry?.type === "base") {
        const item = entry.item;
        cell.classList.add("has-item");
        cell.innerHTML = \`\${this.baseGlyph(item.id)}<span>\${item.name}</span>\`;
        cell.addEventListener("click", () => this.openV9BaseItem(item));
      } else if (entry?.type === "firearm") {
        const item = entry.item;
        cell.classList.add("has-item");
        cell.innerHTML = \`\${this.firearmGlyph(item)}<span>\${this.shortName(item)}</span>\`;
        cell.addEventListener("click", () => this.openV9FirearmItem(item, "backpack"));
      }
      grid.append(cell);
    }
    panel.querySelector(".overlay-back")?.addEventListener("click", this.closeV9Ui);
    this.overlay.replaceChildren(panel);
  }

`,
    "backpack renderer",
  );
}
await writeFile(v9Path, v9, "utf8");

const v17Path = new URL("../src/scenes/BunkerV17Scene.ts", import.meta.url);
let v17 = await readFile(v17Path, "utf8");

if (!v17.includes("CONSUMABLES.orangePop")) {
  v17 = replaceMethod(
    v17,
    ["  private storageDefinitions(): Array<[ConsumableDefinition, number]> {"],
    ["  private toBaseItem("],
    `  private storageDefinitions(): Array<[ConsumableDefinition, number]> {
    const definitions = [
      CONSUMABLES.flask,
      CONSUMABLES.cola,
      CONSUMABLES.orangePop,
      CONSUMABLES.beans,
      CONSUMABLES.energyBar,
      CONSUMABLES.crisps,
      CONSUMABLES.chocolate,
      CONSUMABLES.apple,
      CONSUMABLES.ration,
      CONSUMABLES.crackers,
      CONSUMABLES.peaches,
      CONSUMABLES.soup,
      CONSUMABLES.jerkyFood,
    ];
    const reserved = new Set([7, 8, 9, 10, 11, 12]);
    const slots = Array.from({ length: 18 }, (_, slot) => slot).filter(
      (slot) => !reserved.has(slot),
    );
    return definitions.slice(0, slots.length).map((definition, index) => [
      definition,
      slots[index]!,
    ]);
  }

`,
    "storage definitions",
  );
}

if (!v17.includes("usedSlots = new Set")) {
  v17 = v17.replace(
    "    const occupied = new Set(detail.items.map((item) => item.id));\n    const definitions = this.storageDefinitions();",
    "    const occupied = new Set(detail.items.map((item) => item.id));\n    const usedSlots = new Set(detail.items.map((item) => item.slot));\n    const definitions = this.storageDefinitions();",
  );
  v17 = v17.replace(
    "    for (const [definition, slot] of definitions) {\n      if (occupied.has(definition.id)) continue;",
    "    for (const [definition, preferredSlot] of definitions) {\n      if (occupied.has(definition.id)) continue;\n      const slot = usedSlots.has(preferredSlot)\n        ? Array.from({ length: 18 }, (_, candidate) => candidate).find(\n            (candidate) => !usedSlots.has(candidate) && ![7, 8, 9, 10, 11, 12].includes(candidate),\n          )\n        : preferredSlot;\n      if (slot === undefined) continue;",
  );
  v17 = v17.replace(
    "      detail.items.push(this.toBaseItem(definition, slot, false));",
    "      detail.items.push(this.toBaseItem(definition, slot, false));\n      usedSlots.add(slot);",
  );
}

if (!v17.includes('definition.kind === "drink" ? "DRINK"')) {
  v17 = v17.replace(
    '    button.textContent = definition.kind === "food" ? "EAT" : "DRINK";',
    '    button.textContent = definition.kind === "food" ? "EAT" : "DRINK";',
  );
  v17 = v17.replace(
    '      if (definition.kind === "food") void this.eat(definition);\n      else void this.drinkFlask();',
    '      if (definition.kind === "food") void this.eat(definition);\n      else if (definition.kind === "drink") void this.drinkPackaged(definition);\n      else void this.drinkFlask();',
  );
  const drinkMethod = `  private async drinkPackaged(definition: ConsumableDefinition): Promise<void> {
    const runtime = this.runtimeV17();
    if (runtime.thirst >= 100) {
      this.toast("Not thirsty.");
      return;
    }
    const state = this.consumables.get(definition.id);
    if (state.quantity <= 0) return;
    const hydration = Math.min(100 - runtime.thirst, definition.hydrationRestored);
    const hunger = Math.min(100 - runtime.hunger, definition.hungerRestored);
    await this.animateConsumption("drink", hydration, (progress) => {
      runtime.thirst = Math.min(100, runtime.thirst + hydration * progress);
      runtime.hunger = Math.min(100, runtime.hunger + hunger * progress);
      runtime.emitState();
    });
    this.consumables.consumeOne(definition.id);
    if (this.consumables.get(definition.id).quantity <= 0) {
      runtime.backpack.delete(definition.id);
      this.carried.delete(definition.id);
    }
    this.pulseNeed("thirst");
    this.playInventoryTick();
    runtime.openBackpack();
  }

`;
  const marker = "  private async animateConsumption(";
  if (!v17.includes(marker)) throw new Error("prepare-v20 missing consumption marker");
  v17 = v17.replace(marker, `${drinkMethod}${marker}`);
}

if (!v17.includes("runtime.thirst + hydrationDelta")) {
  v17 = v17.replace(
    "    const restored = Math.min(100 - runtime.hunger, definition.hungerRestored);\n    await this.animateConsumption(\"eat\", restored, (progress) => {\n      runtime.hunger = Math.min(100, runtime.hunger + restored * progress);\n      runtime.emitState();\n    });",
    "    const restored = Math.min(100 - runtime.hunger, definition.hungerRestored);\n    const hydrationDelta = Math.max(-runtime.thirst, Math.min(100 - runtime.thirst, definition.hydrationRestored));\n    await this.animateConsumption(\"eat\", restored, (progress) => {\n      runtime.hunger = Math.min(100, runtime.hunger + restored * progress);\n      runtime.thirst = Math.max(0, Math.min(100, runtime.thirst + hydrationDelta * progress));\n      runtime.emitState();\n    });",
  );
}

await writeFile(v17Path, v17, "utf8");

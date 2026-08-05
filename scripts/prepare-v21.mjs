import { readFile, writeFile } from "node:fs/promises";

function replaceMethod(source, starts, ends, replacement, label) {
  const startToken = starts.find((token) => source.includes(token));
  if (!startToken) throw new Error(`prepare-v21 missing ${label} start`);
  const start = source.indexOf(startToken);
  const endToken = ends.find(
    (token) => source.indexOf(token, start + startToken.length) >= 0,
  );
  if (!endToken) throw new Error(`prepare-v21 missing ${label} end`);
  const end = source.indexOf(endToken, start + startToken.length);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

const v9Path = new URL("../src/scenes/BunkerV9Scene.ts", import.meta.url);
let v9 = await readFile(v9Path, "utf8");

v9 = replaceMethod(
  v9,
  ["  private openV9BaseItem(", "  private openBaseItem("],
  ["  private openV9FirearmItem(", "  private openFirearmItem("],
  `  private openV9BaseItem(item: BaseItem): void {
    const panel = document.createElement("div");
    panel.className = "item-panel firearm-item-panel";
    panel.innerHTML = \`<header><h2>\${item.name}</h2><p>\${item.description}</p></header><div class="firearm-art">\${this.baseGlyph(item.id)}</div><div class="item-info"><p>\${item.details}</p><ul>\${item.stats.map((stat) => \`<li>\${stat}</li>\`).join("")}</ul></div><div class="item-actions"></div>\`;
    const actions = panel.querySelector<HTMLElement>(".item-actions");
    if (!actions) throw new Error("Actions missing");
    const runtime = this.runtimeV9();
    const isKnife = item.id === "knife";
    const inStorage = !item.taken;

    if (inStorage) {
      actions.append(this.button("TAKE", () => {
        window.dispatchEvent(new CustomEvent("bunker-take-item", { detail: { id: item.id } }));
        item.taken = true;
        runtime.backpack.set(item.id, item);
        this.openV9Storage();
      }));
      if (isKnife) actions.append(this.button("ARM", () => {
        item.taken = true;
        runtime.backpack.set(item.id, item);
        runtime.knifeLocation = "armed";
        this.pistolArmed = false;
        this.closeV9Ui();
        this.toast("KNIFE ARMED · A / WEAPON TO STAB · Y / THROW");
      }));
    } else if (isKnife) {
      const armed = runtime.knifeLocation === "armed";
      actions.append(this.button(armed ? "UNARM" : "ARM", () => {
        runtime.knifeLocation = armed ? "backpack" : "armed";
        if (!armed) this.pistolArmed = false;
        this.openV9Backpack();
        this.toast(armed ? "KNIFE RETURNED TO BACKPACK" : "KNIFE ARMED");
      }));
    }

    actions.append(this.button("BACK", () => inStorage ? this.openV9Storage() : this.openV9Backpack()));
    this.v9Overlay.replaceChildren(panel);
  }

`,
  "base item interaction",
);

if (!v9.includes("public switchV9Weapon")) {
  const marker = "  private loadMagazine(";
  if (!v9.includes(marker))
    throw new Error("prepare-v21 missing magazine marker");
  const method = `  public switchV9Weapon(): void {
    if (this.runtimeV9().uiOpen) return;
    const runtime = this.runtimeV9();
    const hasKnife = runtime.backpack.has("knife") || runtime.knifeLocation === "armed";
    const pistol = this.firearmItems.get("makarov");
    const hasPistol = pistol?.location === "backpack" || this.pistolArmed;
    if (this.pistolArmed && hasKnife) {
      this.pistolArmed = false;
      runtime.knifeLocation = "armed";
      this.toast("KNIFE READY");
    } else if (runtime.knifeLocation === "armed" && hasPistol) {
      runtime.knifeLocation = "backpack";
      this.pistolArmed = true;
      this.toast("MAKAROV READY");
    } else if (hasPistol) {
      this.pistolArmed = true;
      runtime.knifeLocation = runtime.knifeLocation === "armed" ? "backpack" : runtime.knifeLocation;
      this.toast("MAKAROV READY");
    } else if (hasKnife) {
      runtime.knifeLocation = "armed";
      this.pistolArmed = false;
      this.toast("KNIFE READY");
    } else this.toast("NO WEAPON AVAILABLE");
  }

`;
  v9 = v9.replace(marker, `${method}${marker}`);
}

v9 = v9.replace(
  '    if (origin === "storage")\n      actions.append(\n        this.button("TAKE", () => {\n          item.location = "backpack";\n          this.openV9Storage();\n        }),\n      );',
  '    if (origin === "storage") {\n      actions.append(this.button("TAKE", () => { item.location = "backpack"; this.openV9Storage(); }));\n      if (item.kind === "pistol") actions.append(this.button("ARM", () => { item.location = "backpack"; this.pistolArmed = true; this.runtimeV9().knifeLocation = this.runtimeV9().knifeLocation === "armed" ? "backpack" : this.runtimeV9().knifeLocation; this.closeV9Ui(); this.toast("MAKAROV ARMED"); }));\n    }',
);

v9 = v9.replace(
  '          this.pistolArmed ? "ARMED" : "ARM",\n          () => {\n            this.pistolArmed = true;',
  '          this.pistolArmed ? "UNARM" : "ARM",\n          () => {\n            this.pistolArmed = !this.pistolArmed;',
);
v9 = v9.replace(
  '            this.runtimeV9().knifeLocation =\n              this.runtimeV9().knifeLocation === "armed"\n                ? "backpack"\n                : this.runtimeV9().knifeLocation;\n            this.closeV9Ui();\n            this.toast("MAKAROV ARMED · A / WEAPON TO FIRE");',
  '            if (this.pistolArmed) this.runtimeV9().knifeLocation = this.runtimeV9().knifeLocation === "armed" ? "backpack" : this.runtimeV9().knifeLocation;\n            this.openV9Backpack();\n            this.toast(this.pistolArmed ? "MAKAROV ARMED · A / WEAPON TO FIRE" : "MAKAROV RETURNED TO BACKPACK");',
);
await writeFile(v9Path, v9, "utf8");

const v17Path = new URL("../src/scenes/BunkerV17Scene.ts", import.meta.url);
let v17 = await readFile(v17Path, "utf8");
v17 = v17.replace(
  "  reloadFromPouch: () => void;",
  "  reloadFromPouch: () => void;\n  switchV9Weapon: () => void;",
);
v17 = v17.replace(
  "    this.createReloadButton();",
  "    this.createReloadButton();\n    this.createWeaponSwitchButton();",
);
v17 = v17.replace(
  '      document.querySelector(".reload-button")?.remove();',
  '      document.querySelector(".reload-button")?.remove();\n      document.querySelector(".weapon-switch-button")?.remove();',
);
if (!v17.includes("private createWeaponSwitchButton")) {
  const marker = "  private findPlayer():";
  const method = `  private createWeaponSwitchButton(): void {
    const parent = document.querySelector<HTMLElement>("#app");
    if (!parent || parent.querySelector(".weapon-switch-button")) return;
    const button = document.createElement("button");
    button.className = "weapon-switch-button";
    button.textContent = "SWAP";
    button.setAttribute("aria-label", "Switch equipped weapon");
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.runtimeV17().switchV9Weapon();
    });
    parent.append(button);
  }

`;
  if (!v17.includes(marker))
    throw new Error("prepare-v21 missing player marker");
  v17 = v17.replace(marker, `${method}${marker}`);
}
v17 = v17.replace(
  '      !actions ||\n      panel.dataset.consumableDecorated === "true"',
  '      !actions ||\n      panel.dataset.consumableDecorated === "true"',
);
v17 = v17.replace(
  "    const inBackpack = this.runtimeV17().backpack.has(definition.id);\n    if (!inBackpack) return;",
  "    const inBackpack = this.runtimeV17().backpack.has(definition.id);",
);
v17 = v17.replace(
  '      if (definition.kind === "food") void this.eat(definition);\n      else if (definition.kind === "drink") void this.drinkPackaged(definition);\n      else void this.drinkFlask();',
  '      if (definition.kind === "food") void this.eat(definition, inBackpack);\n      else if (definition.kind === "drink") void this.drinkPackaged(definition, inBackpack);\n      else void this.drinkFlask(inBackpack);',
);
v17 = v17.replace(
  "  private async drinkFlask(): Promise<void> {",
  "  private async drinkFlask(inBackpack = true): Promise<void> {",
);
v17 = v17.replace(
  "    runtime.openBackpack();\n  }\n\n  private async eat",
  '    if (inBackpack) runtime.openBackpack();\n    else document.querySelector<HTMLButtonElement>(".item-back")?.click();\n  }\n\n  private async eat',
);
v17 = v17.replace(
  "  private async eat(definition: ConsumableDefinition): Promise<void> {",
  "  private async eat(definition: ConsumableDefinition, inBackpack = true): Promise<void> {",
);
v17 = v17.replace(
  "    const restored = Math.min(100 - runtime.hunger, definition.hungerRestored);",
  "    const servings = definition.servingsPerItem ?? 1;\n    const restored = Math.min(100 - runtime.hunger, definition.hungerRestored / servings);",
);
v17 = v17.replace(
  "    this.consumables.consumeOne(definition.id);",
  "    this.consumables.consumeServing(definition.id, definition.servingsPerItem ?? 1);",
);
v17 = v17.replace(
  "    runtime.openBackpack();\n  }\n\n  private async animateConsumption",
  '    if (inBackpack) runtime.openBackpack();\n    else document.querySelector<HTMLButtonElement>(".item-back")?.click();\n  }\n\n  private async animateConsumption',
);
v17 = v17.replace(
  "  private async drinkPackaged(\n    definition: ConsumableDefinition,\n  ): Promise<void> {",
  "  private async drinkPackaged(\n    definition: ConsumableDefinition,\n    inBackpack = true,\n  ): Promise<void> {",
);
v17 = v17.replace(
  "    runtime.openBackpack();\n  }\n\n  private async animateConsumption",
  '    if (inBackpack) runtime.openBackpack();\n    else document.querySelector<HTMLButtonElement>(".item-back")?.click();\n  }\n\n  private async animateConsumption',
);
v17 = v17.replace(
  ".reload-button{position:absolute;",
  ".weapon-switch-button{position:absolute;left:max(160px,calc(env(safe-area-inset-left) + 152px));top:max(12px,env(safe-area-inset-top));z-index:90;width:64px;height:42px;border:2px solid #8b806d;border-radius:8px;background:#2b241b;color:#f3e7cd;font:800 11px monospace;touch-action:manipulation}.game-overlay.is-open~.weapon-switch-button,.weapon-switch-button.is-hidden{display:none}.reload-button{position:absolute;",
);
await writeFile(v17Path, v17, "utf8");

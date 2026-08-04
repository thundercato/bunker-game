import { readFile, writeFile } from "node:fs/promises";

function patchMethod(source, startToken, endToken, patch, label) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`prepare-v19 missing ${label}`);
  const before = source.slice(0, start);
  const method = source.slice(start, end);
  const after = source.slice(end);
  return `${before}${patch(method)}${after}`;
}

const firstPath = new URL("../src/scenes/BunkerV16Scene.ts", import.meta.url);
let first = await readFile(firstPath, "utf8");
if (!first.includes("v16Decorated")) {
  first = patchMethod(
    first,
    "  private decorateItemPanel(): void {",
    "  private makeAction(",
    (method) => {
      const guarded = method.replace(
        'actions.querySelector(".v16-action")',
        'panel.dataset.v16Decorated === "true"',
      );
      if (guarded === method) throw new Error("prepare-v19 missing first guard");
      const marked = guarded.replace(
        "      return;",
        '      return;\n    panel.dataset.v16Decorated = "true";',
      );
      if (marked === guarded) throw new Error("prepare-v19 missing first marker");
      return marked;
    },
    "first decorator method",
  );
  await writeFile(firstPath, first, "utf8");
}

const secondPath = new URL("../src/scenes/BunkerV17Scene.ts", import.meta.url);
let second = await readFile(secondPath, "utf8");
if (!second.includes("consumableDecorated")) {
  second = patchMethod(
    second,
    "  private decorateConsumablePanel(): void {",
    "  private async drinkFlask(): Promise<void> {",
    (method) => {
      const guarded = method.replace(
        'actions.querySelector(".consume-action")',
        'panel.dataset.consumableDecorated === "true"',
      );
      if (guarded === method) throw new Error("prepare-v19 missing second guard");
      const marked = guarded.replace(
        "    if (!definition) return;",
        '    if (!definition) return;\n    panel.dataset.consumableDecorated = "true";',
      );
      if (marked === guarded) throw new Error("prepare-v19 missing second marker");
      return marked;
    },
    "second decorator method",
  );
  await writeFile(secondPath, second, "utf8");
}

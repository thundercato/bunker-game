import { readFile, writeFile } from "node:fs/promises";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`prepare-v19 missing ${label}`);
  return source.replace(before, after);
}

const firstPath = new URL("../src/scenes/BunkerV16Scene.ts", import.meta.url);
let first = await readFile(firstPath, "utf8");
if (!first.includes("v16Decorated")) {
  first = replaceOnce(
    first,
    '    if (!panel || !actions || actions.querySelector(".v16-action")) return;\n\n    const runtime = this.runtime();',
    '    if (!panel || !actions || panel.dataset.v16Decorated === "true") return;\n    panel.dataset.v16Decorated = "true";\n\n    const runtime = this.runtime();',
    "first panel guard",
  );
  await writeFile(firstPath, first, "utf8");
}

const secondPath = new URL("../src/scenes/BunkerV17Scene.ts", import.meta.url);
let second = await readFile(secondPath, "utf8");
if (!second.includes("consumableDecorated")) {
  second = replaceOnce(
    second,
    '      !actions ||\n      actions.querySelector(".consume-action")\n    )\n      return;',
    '      !actions ||\n      panel.dataset.consumableDecorated === "true"\n    )\n      return;',
    "second panel guard",
  );
  second = replaceOnce(
    second,
    '    if (!definition) return;\n\n    const state = this.consumables.get(definition.id);',
    '    if (!definition) return;\n    panel.dataset.consumableDecorated = "true";\n\n    const state = this.consumables.get(definition.id);',
    "second panel marker",
  );
  await writeFile(secondPath, second, "utf8");
}

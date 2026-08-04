import { readFile, writeFile } from "node:fs/promises";

function replacePattern(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`prepare-v19 missing ${label}`);
  return source.replace(pattern, replacement);
}

const firstPath = new URL("../src/scenes/BunkerV16Scene.ts", import.meta.url);
let first = await readFile(firstPath, "utf8");
if (!first.includes("v16Decorated")) {
  first = replacePattern(
    first,
    /    if \(\s*!panel \|\|\s*!actions \|\|\s*actions\.querySelector\("\.v16-action"\)\s*\)\s*return;\s*\n\s*const runtime = this\.runtime\(\);/,
    '    if (!panel || !actions || panel.dataset.v16Decorated === "true") return;\n    panel.dataset.v16Decorated = "true";\n\n    const runtime = this.runtime();',
    "first panel guard",
  );
  await writeFile(firstPath, first, "utf8");
}

const secondPath = new URL("../src/scenes/BunkerV17Scene.ts", import.meta.url);
let second = await readFile(secondPath, "utf8");
if (!second.includes("consumableDecorated")) {
  second = replacePattern(
    second,
    /      !actions \|\|\s*actions\.querySelector\("\.consume-action"\)/,
    '      !actions ||\n      panel.dataset.consumableDecorated === "true"',
    "second panel guard",
  );
  second = replacePattern(
    second,
    /    if \(!definition\) return;\s*\n\s*const state = this\.consumables\.get\(definition\.id\);/,
    '    if (!definition) return;\n    panel.dataset.consumableDecorated = "true";\n\n    const state = this.consumables.get(definition.id);',
    "second panel marker",
  );
  await writeFile(secondPath, second, "utf8");
}

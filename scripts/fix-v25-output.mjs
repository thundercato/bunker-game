import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

if (scene.includes("TUNNEL_SURVIVAL_V25")) {
  scene = scene.replaceAll("this.player", "this.tunnelPlayer");
  scene = scene.replaceAll("this.toast(", "this.tunnelToast(");
}

await writeFile(scenePath, scene, "utf8");

import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

if (!scene.includes("CENTRED_TUNNEL_CAMERA_V26")) {
  const previous = `      camera.stopFollow();
      camera.setZoom(1);
      camera.startFollow(player, true, 0.12, 0.12);
      camera.centerOn(player.x, player.y);`;
  const replacement = `      camera.stopFollow();
      camera.removeBounds();
      camera.setDeadzone(0, 0);
      camera.setZoom(1);
      camera.startFollow(player, true, 1, 1, 0, 0); // CENTRED_TUNNEL_CAMERA_V26
      camera.centerOn(player.x, player.y);`;

  if (!scene.includes(previous)) {
    throw new Error("prepare-v26: tunnel camera block was not found");
  }
  scene = scene.replace(previous, replacement);
}

await writeFile(scenePath, scene, "utf8");

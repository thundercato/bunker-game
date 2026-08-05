import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

scene = scene
  .replaceAll(
    "private player?: Phaser.Physics.Arcade.Sprite;",
    "private tunnelPlayer?: Phaser.Physics.Arcade.Sprite;",
  )
  .replaceAll("this.player", "this.tunnelPlayer")
  .replaceAll("private runtime(): Runtime", "private runtimeV28(): Runtime")
  .replaceAll("this.runtime()", "this.runtimeV28()")
  .replaceAll(
    "this.make.graphics({ x: 0, y: 0, add: false })",
    "this.make.graphics({ x: 0, y: 0 })",
  )
  .replaceAll(
    "this.make.graphics({x:0,y:0,add:false})",
    "this.make.graphics({ x: 0, y: 0 })",
  );

await writeFile(scenePath, scene, "utf8");

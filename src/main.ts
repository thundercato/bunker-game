import Phaser from "phaser";
import { TileWorldScene } from "@/scenes/TileWorldScene";
import "@/style.css";

const parent = document.querySelector<HTMLElement>("#app");
if (!parent) throw new Error("Missing #app element.");

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 1280,
  height: 720,
  backgroundColor: "#05090d",
  scene: [TileWorldScene],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

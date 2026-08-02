import Phaser from "phaser";
import { ScrollingBunkerV3Scene } from "@/scenes/ScrollingBunkerV3Scene";
import "@/style.css";

const parent = document.querySelector<HTMLElement>("#app");
if (!parent) throw new Error("Missing #app element.");

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 1280,
  height: 720,
  backgroundColor: "#05090d",
  scene: [ScrollingBunkerV3Scene],
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

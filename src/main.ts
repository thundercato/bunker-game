import Phaser from "phaser";
import { BunkerRoomScene } from "@/scenes/BunkerRoomScene";
import "@/style.css";

const parent = document.querySelector<HTMLElement>("#app");
if (!parent) throw new Error("Missing #app element.");

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 1280,
  height: 720,
  backgroundColor: "#05090d",
  scene: [BunkerRoomScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

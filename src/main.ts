import Phaser from "phaser";
import { ScrollingBunkerV3Scene } from "@/scenes/ScrollingBunkerV3Scene";
import "@/style.css";

const VERSION = "0.4.00";
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

const versionBadge = document.createElement("div");
versionBadge.className = "start-version";
versionBadge.textContent = `BUNKER v${VERSION}`;
parent.append(versionBadge);

const controls = document.createElement("div");
controls.className = "touch-controls";
controls.setAttribute("aria-label", "Touch controls");
controls.innerHTML = `
  <div class="touch-dpad" aria-label="Movement controls">
    <button class="touch-button touch-up" data-key="w" aria-label="Move up">▲</button>
    <button class="touch-button touch-left" data-key="a" aria-label="Move left">◀</button>
    <button class="touch-button touch-down" data-key="s" aria-label="Move down">▼</button>
    <button class="touch-button touch-right" data-key="d" aria-label="Move right">▶</button>
  </div>
  <div class="touch-actions" aria-label="Action controls">
    <button class="touch-button touch-back" data-key="Escape">BACK</button>
    <button class="touch-button touch-use" data-key="e">USE</button>
  </div>
`;
parent.append(controls);

const sendKey = (type: "keydown" | "keyup", key: string): void => {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      key,
      code: key === "Escape" ? "Escape" : `Key${key.toUpperCase()}`,
      bubbles: true,
      cancelable: true,
    }),
  );
};

for (const button of controls.querySelectorAll<HTMLButtonElement>(
  "[data-key]",
)) {
  const key = button.dataset.key;
  if (!key) continue;

  const press = (event: Event): void => {
    event.preventDefault();
    button.classList.add("is-pressed");
    sendKey("keydown", key);
  };
  const release = (event: Event): void => {
    event.preventDefault();
    button.classList.remove("is-pressed");
    sendKey("keyup", key);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

const enterGame = (): void => {
  versionBadge.remove();
  controls.classList.add("is-active");
};
parent.addEventListener("pointerdown", enterGame, { once: true });

import Phaser from "phaser";
import { setVirtualKey } from "@/input/TouchInputBridge";
import { ScrollingBunkerV3Scene } from "@/scenes/ScrollingBunkerV3Scene";
import "@/style.css";

const VERSION = "0.4.02";
const parent = document.querySelector<HTMLElement>("#app");
if (!parent) throw new Error("Missing #app element.");

const game = new Phaser.Game({
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

for (const button of controls.querySelectorAll<HTMLButtonElement>(
  "[data-key]",
)) {
  const key = button.dataset.key;
  if (!key) continue;

  const press = (event: PointerEvent): void => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.classList.add("is-pressed");
    setVirtualKey(game, key, true);
  };

  const release = (event: PointerEvent): void => {
    event.preventDefault();
    if (button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }
    button.classList.remove("is-pressed");
    setVirtualKey(game, key, false);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => {
    button.classList.remove("is-pressed");
    setVirtualKey(game, key, false);
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

const releaseAllTouchKeys = (): void => {
  for (const key of ["w", "a", "s", "d", "e", "Escape"]) {
    setVirtualKey(game, key, false);
  }
  for (const button of controls.querySelectorAll<HTMLButtonElement>(
    ".is-pressed",
  )) {
    button.classList.remove("is-pressed");
  }
};

window.addEventListener("blur", releaseAllTouchKeys);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseAllTouchKeys();
});

const enterGame = (): void => {
  versionBadge.remove();
  controls.classList.add("is-active");
};
parent.addEventListener("pointerdown", enterGame, { once: true });

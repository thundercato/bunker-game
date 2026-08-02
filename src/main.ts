import Phaser from "phaser";
import { setVirtualKey } from "@/input/TouchInputBridge";
import { BunkerV6Scene } from "@/scenes/BunkerV6Scene";
import { SurvivalController } from "@/systems/SurvivalController";
import "@/style.css";
import "@/sleep.css";

const VERSION = "0.6.00";
const parent = document.querySelector<HTMLElement>("#app");
if (!parent) throw new Error("Missing #app element.");

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 1280,
  height: 720,
  backgroundColor: "#05090d",
  scene: [BunkerV6Scene],
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  pixelArt: true,
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
const survival = new SurvivalController(game);

const versionBadge = document.createElement("div");
versionBadge.className = "start-version";
versionBadge.textContent = `BUNKER v${VERSION}`;
parent.append(versionBadge);

const hud = document.createElement("aside");
hud.className = "survival-hud";
hud.innerHTML = `
  <div class="watch-shell"><span class="watch-time">08:00</span></div>
  <div class="status-row"><span>HEALTH</span><i><b class="health-fill"></b></i></div>
  <div class="status-row"><span>HUNGER</span><i><b class="hunger-fill"></b></i></div>
  <div class="status-row"><span>THIRST</span><i><b class="thirst-fill"></b></i></div>
  <div class="status-row stamina-row"><span>STAMINA</span><i><b class="stamina-fill"></b></i></div>
`;
parent.append(hud);

const sleepCurtain = document.createElement("div");
sleepCurtain.className = "sleep-curtain";
parent.append(sleepCurtain);

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
    <button class="touch-button touch-run" data-key="Shift">RUN</button>
    <button class="touch-button touch-back" data-key="Escape">BACK</button>
    <button class="touch-button touch-use" data-key="e">USE</button>
  </div>
`;
parent.append(controls);

for (const button of controls.querySelectorAll<HTMLButtonElement>("[data-key]")) {
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
  for (const key of ["w", "a", "s", "d", "e", "Escape", "Shift"]) {
    setVirtualKey(game, key, false);
  }
  for (const button of controls.querySelectorAll<HTMLButtonElement>(".is-pressed")) {
    button.classList.remove("is-pressed");
  }
};
window.addEventListener("blur", releaseAllTouchKeys);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseAllTouchKeys();
});

const overlay = document.createElement("section");
overlay.className = "game-overlay";
parent.append(overlay);

type StoredItem = {
  id: "cigarettes" | "jerky";
  name: string;
  description: string;
  details: string;
  stats: string[];
  slot: number;
  taken: boolean;
};
let storageItems: StoredItem[] = [];
let currentTime = "08:00";

const showOverlay = (): void => {
  overlay.classList.add("is-open");
  controls.classList.add("is-hidden");
  survival.setUiOpen(true);
};

const closeOverlay = (): void => {
  overlay.classList.remove("is-open");
  overlay.replaceChildren();
  controls.classList.remove("is-hidden");
  survival.setUiOpen(false);
};

const closeStorage = (): void => {
  closeOverlay();
  window.dispatchEvent(new Event("bunker-storage-close"));
};

const itemArt = (item: StoredItem): string =>
  item.id === "cigarettes"
    ? `<div class="item-art cigarettes-art"><div class="cig-pack"><span>№ 6</span><small>FILTER</small></div></div>`
    : `<div class="item-art jerky-art"><div class="jerky-pack"><span>BEEF</span><small>JERKY</small><i></i><i></i></div></div>`;

const renderStorage = (): void => {
  showOverlay();
  const panel = document.createElement("div");
  panel.className = "storage-panel";
  panel.innerHTML = `<header><h2>STORAGE TRUNK</h2><p>6 × 3 storage grid</p></header><div class="storage-grid"></div><button class="overlay-back">BACK</button>`;
  const grid = panel.querySelector<HTMLElement>(".storage-grid");
  if (!grid) throw new Error("Storage grid missing");
  for (let slot = 0; slot < 18; slot += 1) {
    const item = storageItems.find(
      (candidate) => candidate.slot === slot && !candidate.taken,
    );
    const cell = document.createElement("button");
    cell.className = `storage-cell${item ? " has-item" : ""}`;
    cell.disabled = !item;
    if (item) {
      cell.innerHTML = `${item.id === "cigarettes" ? "▥" : "▰"}<span>${item.id === "cigarettes" ? "CIGS" : "JERKY"}</span>`;
      cell.addEventListener("click", () => renderItem(item));
    }
    grid.append(cell);
  }
  panel
    .querySelector<HTMLButtonElement>(".overlay-back")
    ?.addEventListener("click", closeStorage);
  overlay.replaceChildren(panel);
};

const renderItem = (item: StoredItem): void => {
  const panel = document.createElement("div");
  panel.className = "item-panel";
  panel.innerHTML = `
    <header><h2>${item.name}</h2><p>${item.description}</p></header>
    ${itemArt(item)}
    <div class="item-info"><p>${item.details}</p><ul>${item.stats.map((stat) => `<li>${stat}</li>`).join("")}</ul></div>
    <div class="item-actions"><button class="take-item">TAKE</button><button class="item-back">BACK</button></div>
  `;
  panel
    .querySelector<HTMLButtonElement>(".take-item")
    ?.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("bunker-take-item", { detail: { id: item.id } }),
      );
    });
  panel
    .querySelector<HTMLButtonElement>(".item-back")
    ?.addEventListener("click", renderStorage);
  overlay.replaceChildren(panel);
};

const delay = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const beginSleep = async (hours: number): Promise<void> => {
  overlay.classList.remove("is-open");
  overlay.replaceChildren();
  controls.classList.add("is-hidden");
  survival.setUiOpen(true);
  sleepCurtain.classList.add("is-black");
  await delay(1000);
  hud.classList.add("is-fast-forward");

  const result = await survival.sleep(hours);

  hud.classList.remove("is-fast-forward");
  sleepCurtain.classList.remove("is-black");
  await delay(1000);
  controls.classList.remove("is-hidden");
  survival.setUiOpen(false);

  if (result.wokeEarly) {
    const notice = document.createElement("div");
    notice.className = "wake-notice";
    notice.textContent = "YOU WAKE EARLY. HUNGER OR THIRST IS TOO LOW.";
    parent.append(notice);
    window.setTimeout(() => notice.remove(), 3200);
  }
};

const renderSleep = (): void => {
  showOverlay();
  let hours = 8;
  const panel = document.createElement("div");
  panel.className = "sleep-panel";
  panel.innerHTML = `
    <h2>SLEEP</h2>
    <div class="sleep-stepper">
      <button class="sleep-minus" aria-label="Reduce sleep time">−</button>
      <div><strong class="sleep-hours">8</strong><span>HOURS</span></div>
      <button class="sleep-plus" aria-label="Increase sleep time">+</button>
    </div>
    <button class="sleep-confirm">SLEEP</button>
    <div class="sleep-until">
      <button data-hour="6">06:00</button>
      <button data-hour="12">12:00</button>
      <button data-hour="18">18:00</button>
    </div>
    <button class="sleep-cancel">BACK</button>
  `;
  const display = panel.querySelector<HTMLElement>(".sleep-hours");
  const updateHours = (): void => {
    if (display) display.textContent = hours.toString();
  };
  panel.querySelector(".sleep-minus")?.addEventListener("click", () => {
    hours = Math.max(1, hours - 1);
    updateHours();
  });
  panel.querySelector(".sleep-plus")?.addEventListener("click", () => {
    hours = Math.min(24, hours + 1);
    updateHours();
  });
  panel
    .querySelector(".sleep-confirm")
    ?.addEventListener("click", () => void beginSleep(hours));
  for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-hour]")) {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.hour);
      void beginSleep(survival.hoursUntil(target));
    });
  }
  panel
    .querySelector(".sleep-cancel")
    ?.addEventListener("click", closeOverlay);
  overlay.replaceChildren(panel);
};

const renderMessage = (title: string, text: string): void => {
  if (title === "YOUR BUNK") {
    renderSleep();
    return;
  }
  showOverlay();
  const panel = document.createElement("div");
  panel.className = "message-panel";
  panel.innerHTML = `<h2>${title}</h2><p>${text}</p><button>BACK</button>`;
  panel.querySelector("button")?.addEventListener("click", closeOverlay);
  overlay.replaceChildren(panel);
};

window.addEventListener("bunker-state", ((
  event: CustomEvent<{
    time: string;
    health: number;
    hunger: number;
    thirst: number;
    stamina: number;
  }>,
) => {
  const setWidth = (selector: string, value: number): void => {
    const element = hud.querySelector<HTMLElement>(selector);
    if (element) {
      element.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
  };
  currentTime = event.detail.time;
  const watch = hud.querySelector<HTMLElement>(".watch-time");
  if (watch) watch.textContent = currentTime;
  setWidth(".health-fill", event.detail.health);
  setWidth(".hunger-fill", event.detail.hunger);
  setWidth(".thirst-fill", event.detail.thirst);
  setWidth(".stamina-fill", event.detail.stamina);
}) as EventListener);

window.addEventListener("bunker-storage-open", ((
  event: CustomEvent<{ items: StoredItem[] }>,
) => {
  storageItems = event.detail.items;
  renderStorage();
}) as EventListener);
window.addEventListener("bunker-storage-close-request", closeStorage);
window.addEventListener("bunker-message", ((
  event: CustomEvent<{ title: string; text: string }>,
) => renderMessage(event.detail.title, event.detail.text)) as EventListener);

const enterGame = (): void => {
  versionBadge.remove();
  controls.classList.add("is-active");
};
parent.addEventListener("pointerdown", enterGame, { once: true });
window.addEventListener("beforeunload", () => survival.destroy());

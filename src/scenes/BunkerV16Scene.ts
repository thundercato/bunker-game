import Phaser from "phaser";
import { BunkerV15Scene } from "./BunkerV15Scene";

const VERSION = "0.1.0.10";
const MAGAZINE_CAPACITY = 8;
const MAINTENANCE_SEGMENTS = 20;

type FirearmItem = {
  id: string;
  name: string;
  kind: "pistol" | "magazine" | "ammo";
  slot: number;
  location: "storage" | "backpack" | "gun" | "hidden";
  rounds: number;
};

type BaseItem = {
  id: string;
  name: string;
  description: string;
  details: string;
  stats: string[];
  slot: number;
  taken: boolean;
};

type Runtime = {
  uiOpen: boolean;
  knifeLocation: "storage" | "backpack" | "armed" | "world";
  knifeSharpness: number;
  backpack: Map<string, BaseItem>;
  firearmItems: Map<string, FirearmItem>;
  insertedMagazine: string | null;
  chamberedRound: boolean;
  pistolArmed: boolean;
  openStorage: (items: BaseItem[]) => void;
  openBackpack: () => void;
  openV10WeaponList: () => void;
};

type Tool = "spray" | "brush" | "stone";
type MaintenanceState = {
  sprayed: boolean[];
  cleaned: number[];
};

type TargetState = {
  body: Phaser.GameObjects.Rectangle;
  axis: "x" | "y";
  min: number;
  max: number;
  speed: number;
  direction: 1 | -1;
  paused: boolean;
};

export class BunkerV16Scene extends BunkerV15Scene {
  private readonly magazinePouches: Array<string | null> = [
    null,
    null,
    null,
    null,
  ];
  private readonly magazineHealth = new Map<string, number>();
  private readonly maintenance = new Map<string, MaintenanceState>();
  private cachedStorageItems: BaseItem[] = [];
  private gunHealth = 200;
  private reloadHeld = false;
  private observer?: MutationObserver;
  private targets: TargetState[] = [];

  public override create(): void {
    window.addEventListener("bunker-storage-open", this.cacheStorage, true);
    window.addEventListener("bunker-gunshot", this.handleShotWear);
    document.addEventListener("click", this.handleDocumentClick, true);
    super.create();
    this.updateVersionLabel();
    this.seedMagazineHealth();
    this.createKillHouseTargets();
    this.installStyles();
    this.observeInterface();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        "bunker-storage-open",
        this.cacheStorage,
        true,
      );
      window.removeEventListener("bunker-gunshot", this.handleShotWear);
      document.removeEventListener("click", this.handleDocumentClick, true);
      this.observer?.disconnect();
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.updateReloadInput();
    this.updateTargets(delta);
    this.removeEmptyAmmoItems();
  }

  private runtime(): Runtime {
    return this as unknown as Runtime;
  }

  private updateVersionLabel(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  private readonly cacheStorage = (event: Event): void => {
    const detail = (event as CustomEvent<{ items: BaseItem[] }>).detail;
    this.cachedStorageItems = detail.items.map((item) => ({ ...item }));
  };

  private readonly handleDocumentClick = (event: Event): void => {
    const target = event.target as HTMLButtonElement | null;
    if (!target) return;
    const label = target.textContent?.trim() ?? "";
    const panel = target.closest<HTMLElement>(
      ".firearm-item-panel, .item-panel",
    );
    if (label === "TAKE" && panel) {
      window.setTimeout(
        () => this.runtime().openStorage(this.cachedStorageItems),
        0,
      );
    }
    if (target.closest(".backpack-button")) {
      window.setTimeout(() => this.decorateBackpack(), 0);
    }
  };

  private observeInterface(): void {
    const overlay = document.querySelector<HTMLElement>(".game-overlay");
    if (!overlay) return;
    this.observer = new MutationObserver(() => {
      this.decorateBackpack();
      this.decorateItemPanel();
      this.decorateWeaponList();
    });
    this.observer.observe(overlay, { childList: true, subtree: true });
  }

  private decorateBackpack(): void {
    const panel = document.querySelector<HTMLElement>(".backpack-panel");
    if (!panel || panel.querySelector(".equipment-column")) return;
    const runtime = this.runtime();
    const equipment = document.createElement("aside");
    equipment.className = "equipment-column";
    equipment.innerHTML = `
      <h3>EQUIPPED</h3>
      <button class="equipment-slot sidearm-slot"><span>SIDEARM</span><b>${runtime.pistolArmed ? "MAKAROV PM" : "EMPTY"}</b></button>
      <button class="equipment-slot knife-slot"><span>KNIFE</span><b>${runtime.knifeLocation === "armed" ? "UTILITY KNIFE" : "EMPTY"}</b></button>
      <h3>MAGAZINE POUCHES</h3>
      <div class="magazine-pouches"></div>`;

    equipment.querySelector(".sidearm-slot")?.addEventListener("click", () => {
      if (!runtime.pistolArmed) return;
      runtime.pistolArmed = false;
      const pistol = runtime.firearmItems.get("makarov");
      if (pistol) pistol.location = "backpack";
      runtime.openBackpack();
    });
    equipment.querySelector(".knife-slot")?.addEventListener("click", () => {
      if (runtime.knifeLocation !== "armed") return;
      runtime.knifeLocation = "backpack";
      runtime.openBackpack();
    });

    const pouches = equipment.querySelector<HTMLElement>(".magazine-pouches");
    if (!pouches) return;
    this.magazinePouches.forEach((id, index) => {
      const magazine = id ? runtime.firearmItems.get(id) : undefined;
      const button = document.createElement("button");
      button.className = "magazine-pouch";
      button.innerHTML = `<span>POUCH ${index + 1}</span><b>${magazine ? `${magazine.name}<br>${magazine.rounds}/${MAGAZINE_CAPACITY}` : "EMPTY"}</b>`;
      button.addEventListener("click", () => {
        if (!id) return;
        this.magazinePouches[index] = null;
        if (magazine) magazine.location = "backpack";
        runtime.openBackpack();
      });
      pouches.append(button);
    });

    panel.append(equipment);
    panel.classList.add("has-equipment-column");
  }

  private decorateItemPanel(): void {
    const panel = document.querySelector<HTMLElement>(".firearm-item-panel");
    const title = panel?.querySelector("h2")?.textContent ?? "";
    const actions = panel?.querySelector<HTMLElement>(".item-actions");
    if (!panel || !actions || actions.querySelector(".v16-action")) return;

    const runtime = this.runtime();
    const magazine = Array.from(runtime.firearmItems.values()).find(
      (item) => item.kind === "magazine" && item.name === title,
    );
    if (magazine && magazine.location === "backpack") {
      const pouchButton = this.makeAction("MOVE TO POUCH", () => {
        const free = this.magazinePouches.findIndex((id) => id === null);
        if (free < 0) return;
        this.magazinePouches[free] = magazine.id;
        magazine.location = "hidden";
        runtime.openBackpack();
      });
      actions.prepend(pouchButton);
    }

    const pistol = runtime.firearmItems.get("makarov");
    if (pistol && title === pistol.name) {
      const health = document.createElement("p");
      health.className = "durability-readout";
      health.textContent = `HEALTH ${this.gunHealth}/200`;
      panel.querySelector(".item-info")?.prepend(health);
    }
    if (magazine) {
      const health = document.createElement("p");
      health.className = "durability-readout";
      health.textContent = `HEALTH ${this.magazineHealth.get(magazine.id) ?? 100}/100`;
      panel.querySelector(".item-info")?.prepend(health);
    }
  }

  private makeAction(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "v16-action";
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }

  private updateReloadInput(): void {
    const pressed = navigator.getGamepads()[0]?.buttons[4]?.pressed ?? false;
    if (pressed && !this.reloadHeld) this.reloadFromPouch();
    this.reloadHeld = pressed;
  }

  private reloadFromPouch(): void {
    const runtime = this.runtime();
    if (!runtime.pistolArmed || runtime.uiOpen) return;
    const pouchIndex = this.magazinePouches.findIndex((id) => {
      const magazine = id ? runtime.firearmItems.get(id) : undefined;
      return (magazine?.rounds ?? 0) > 0;
    });
    if (pouchIndex < 0) return;

    const replacementId = this.magazinePouches[pouchIndex];
    if (!replacementId) return;
    const replacement = runtime.firearmItems.get(replacementId);
    if (!replacement) return;

    const oldId = runtime.insertedMagazine;
    if (oldId) {
      const old = runtime.firearmItems.get(oldId);
      if (old) old.location = "hidden";
      this.magazinePouches[pouchIndex] = oldId;
    } else {
      this.magazinePouches[pouchIndex] = null;
    }
    replacement.location = "gun";
    runtime.insertedMagazine = replacement.id;
    if (!runtime.chamberedRound && replacement.rounds > 0) {
      replacement.rounds -= 1;
      runtime.chamberedRound = true;
    }
    this.toast(`RELOADED · ${replacement.rounds}/${MAGAZINE_CAPACITY}`);
  }

  private seedMagazineHealth(): void {
    for (const item of this.runtime().firearmItems.values()) {
      if (item.kind === "magazine") this.magazineHealth.set(item.id, 100);
    }
  }

  private readonly handleShotWear = (): void => {
    const runtime = this.runtime();
    this.gunHealth = Math.max(0, this.gunHealth - 1);
    const id = runtime.insertedMagazine;
    if (id) {
      const health = this.magazineHealth.get(id) ?? 100;
      this.magazineHealth.set(id, Math.max(0, health - 1));
    }
    this.resolveTargetHit();
  };

  private removeEmptyAmmoItems(): void {
    for (const item of this.runtime().firearmItems.values()) {
      if (item.kind === "ammo" && item.rounds <= 0) item.location = "hidden";
      if (
        item.kind === "ammo" &&
        item.rounds > 0 &&
        item.location === "hidden"
      ) {
        item.location = "backpack";
      }
    }
  }

  private decorateWeaponList(): void {
    const list = document.querySelector<HTMLElement>(".weapon-list");
    if (!list || list.querySelector(".v16-mag-maintenance")) return;
    for (const magazine of this.runtime().firearmItems.values()) {
      if (magazine.kind !== "magazine") continue;
      if (magazine.location === "storage") continue;
      const button = document.createElement("button");
      button.className = "weapon-card v16-mag-maintenance";
      button.innerHTML = `<span class="magazine-maintenance-icon">▥</span><strong>${magazine.name}</strong><small>HEALTH ${this.magazineHealth.get(magazine.id) ?? 100}%</small>`;
      button.addEventListener("click", () =>
        this.openMaintenance(magazine.id, "magazine"),
      );
      list.append(button);
    }

    const knife = list
      .querySelector<HTMLElement>(".knife-silhouette")
      ?.closest("button");
    if (knife) {
      const replacement = knife.cloneNode(true) as HTMLButtonElement;
      replacement.addEventListener("click", () =>
        this.openMaintenance("knife", "knife"),
      );
      knife.replaceWith(replacement);
    }
    const pistol = list
      .querySelector<HTMLElement>(".makarov-silhouette")
      ?.closest("button");
    if (pistol) {
      const replacement = pistol.cloneNode(true) as HTMLButtonElement;
      replacement.addEventListener("click", () =>
        this.openMaintenance("makarov", "gun"),
      );
      pistol.replaceWith(replacement);
    }
  }

  private stateFor(id: string): MaintenanceState {
    let state = this.maintenance.get(id);
    if (!state) {
      state = {
        sprayed: Array.from({ length: MAINTENANCE_SEGMENTS }, () => false),
        cleaned: Array.from({ length: MAINTENANCE_SEGMENTS }, () => 0.2),
      };
      this.maintenance.set(id, state);
    }
    return state;
  }

  private openMaintenance(
    id: string,
    kind: "gun" | "knife" | "magazine",
  ): void {
    const overlay = document.querySelector<HTMLElement>(".game-overlay");
    if (!overlay) return;
    let selectedTool: Tool = "spray";
    let lastPoint: { x: number; y: number } | null = null;
    const state = this.stateFor(id);
    const panel = document.createElement("div");
    panel.className = "workstation-screen tactile-maintenance";
    panel.innerHTML = `
      <h2>${kind === "gun" ? "MAKAROV PM" : kind === "knife" ? "UTILITY KNIFE" : "MAGAZINE"} MAINTENANCE</h2>
      <div class="selected-tool" data-selected-tool="spray">SPRAY CAN</div>
      <div class="maintenance-object ${kind}">
        <div class="maintenance-surface">${state.cleaned.map((_, index) => `<i data-segment="${index}"></i>`).join("")}</div>
        <div class="maintenance-effects"></div>
      </div>
      <div class="maintenance-tools">
        <button data-tool="spray">SPRAY CAN</button>
        <button data-tool="brush">TOOTHBRUSH</button>
        ${kind === "knife" ? '<button data-tool="stone">SHARPENING STONE</button>' : ""}
      </div>
      <div class="maintenance-meter"><span>CONDITION</span><strong></strong><div><i></i></div></div>
      <button class="workstation-back">BACK</button>`;

    const surface = panel.querySelector<HTMLElement>(".maintenance-object");
    const toolDisplay = panel.querySelector<HTMLElement>(".selected-tool");
    if (!surface || !toolDisplay) return;

    const refresh = (): void => {
      panel
        .querySelectorAll<HTMLElement>("[data-segment]")
        .forEach((segment, index) => {
          const clean = state.cleaned[index] ?? 0;
          const sprayed = state.sprayed[index] ?? false;
          segment.style.setProperty("--clean", clean.toString());
          segment.classList.toggle("is-sprayed", sprayed);
        });
      const average =
        state.cleaned.reduce((sum, value) => sum + value, 0) /
        state.cleaned.length;
      const percentage = Math.round(average * 100);
      const value = panel.querySelector<HTMLElement>(
        ".maintenance-meter strong",
      );
      const fill = panel.querySelector<HTMLElement>(".maintenance-meter div i");
      if (value) value.textContent = `${percentage}%`;
      if (fill) fill.style.width = `${percentage}%`;
    };

    panel
      .querySelectorAll<HTMLButtonElement>("[data-tool]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          selectedTool = button.dataset.tool as Tool;
          toolDisplay.dataset.selectedTool = selectedTool;
          toolDisplay.textContent =
            selectedTool === "spray"
              ? "SPRAY CAN"
              : selectedTool === "brush"
                ? "TOOTHBRUSH"
                : "SHARPENING STONE";
          panel
            .querySelectorAll("[data-tool]")
            .forEach((candidate) =>
              candidate.classList.toggle("is-selected", candidate === button),
            );
        });
      });

    const applyAt = (event: PointerEvent, distance: number): void => {
      const rect = surface.getBoundingClientRect();
      const x = Phaser.Math.Clamp(
        (event.clientX - rect.left) / rect.width,
        0,
        0.999,
      );
      const index = Math.floor(x * MAINTENANCE_SEGMENTS);
      if (selectedTool === "spray") {
        state.sprayed[index] = true;
        this.makeMaintenanceEffect(panel, event.clientX, event.clientY, "mist");
      } else if (selectedTool === "brush" && state.sprayed[index]) {
        const limit = kind === "knife" ? 0.8 : 1;
        state.cleaned[index] = Math.min(
          limit,
          (state.cleaned[index] ?? 0) + distance / 520,
        );
        this.makeMaintenanceEffect(
          panel,
          event.clientX,
          event.clientY,
          "spark",
        );
      } else if (selectedTool === "stone" && kind === "knife") {
        const current = state.cleaned[index] ?? 0;
        if (current >= 0.8) {
          state.cleaned[index] = Math.min(1, current + distance / 700);
          this.makeMaintenanceEffect(
            panel,
            event.clientX,
            event.clientY,
            "spark",
          );
        }
      }
      refresh();
    };

    surface.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      surface.setPointerCapture(event.pointerId);
      lastPoint = { x: event.clientX, y: event.clientY };
      applyAt(event, 8);
    });
    surface.addEventListener("pointermove", (event) => {
      if (!surface.hasPointerCapture(event.pointerId) || !lastPoint) return;
      const distance = Math.hypot(
        event.clientX - lastPoint.x,
        event.clientY - lastPoint.y,
      );
      lastPoint = { x: event.clientX, y: event.clientY };
      if (distance >= 2) applyAt(event, distance);
    });
    const release = (): void => {
      lastPoint = null;
    };
    surface.addEventListener("pointerup", release);
    surface.addEventListener("pointercancel", release);
    panel
      .querySelector(".workstation-back")
      ?.addEventListener("click", () => this.runtime().openV10WeaponList());
    overlay.replaceChildren(panel);
    refresh();
  }

  private makeMaintenanceEffect(
    panel: HTMLElement,
    clientX: number,
    clientY: number,
    type: "mist" | "spark",
  ): void {
    const layer = panel.querySelector<HTMLElement>(".maintenance-effects");
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    const count = type === "mist" ? 7 : 3;
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("i");
      particle.className = `maintenance-particle ${type}`;
      particle.style.left = `${clientX - rect.left}px`;
      particle.style.top = `${clientY - rect.top}px`;
      particle.style.setProperty(
        "--dx",
        `${(Math.random() - 0.5) * (type === "mist" ? 90 : 50)}px`,
      );
      particle.style.setProperty(
        "--dy",
        `${(Math.random() - 0.5) * (type === "mist" ? 70 : 35)}px`,
      );
      layer.append(particle);
      window.setTimeout(() => particle.remove(), type === "mist" ? 520 : 330);
    }
  }

  private createKillHouseTargets(): void {
    const horizontal = this.add
      .rectangle(1515, 142, 54, 72, 0xb9a477)
      .setStrokeStyle(4, 0x3d2414)
      .setDepth(30);
    const vertical = this.add
      .rectangle(1810, 310, 54, 72, 0xb9a477)
      .setStrokeStyle(4, 0x3d2414)
      .setDepth(30);
    this.targets = [
      {
        body: horizontal,
        axis: "x",
        min: 1320,
        max: 1740,
        speed: 80,
        direction: 1,
        paused: false,
      },
      {
        body: vertical,
        axis: "y",
        min: 180,
        max: 500,
        speed: 75,
        direction: 1,
        paused: false,
      },
    ];
  }

  private updateTargets(delta: number): void {
    const seconds = delta / 1000;
    for (const target of this.targets) {
      if (target.paused) continue;
      const position = target.axis === "x" ? target.body.x : target.body.y;
      let next = position + target.speed * target.direction * seconds;
      if (next >= target.max) {
        next = target.max;
        target.direction = -1;
      } else if (next <= target.min) {
        next = target.min;
        target.direction = 1;
      }
      if (target.axis === "x") target.body.x = next;
      else target.body.y = next;
    }
  }

  private resolveTargetHit(): void {
    const player = this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite &&
        child.texture.key.startsWith("survivor-"),
    );
    if (!player) return;
    const texture = player.texture.key;
    const direction = texture.includes("left")
      ? "left"
      : texture.includes("up")
        ? "up"
        : texture.includes("down")
          ? "down"
          : "right";

    const target = this.targets.find((candidate) => {
      if (candidate.paused) return false;
      const bounds = candidate.body.getBounds();
      if (direction === "right")
        return (
          bounds.left >= player.x &&
          player.y >= bounds.top &&
          player.y <= bounds.bottom
        );
      if (direction === "left")
        return (
          bounds.right <= player.x &&
          player.y >= bounds.top &&
          player.y <= bounds.bottom
        );
      if (direction === "up")
        return (
          bounds.bottom <= player.y &&
          player.x >= bounds.left &&
          player.x <= bounds.right
        );
      return (
        bounds.top >= player.y &&
        player.x >= bounds.left &&
        player.x <= bounds.right
      );
    });
    if (!target) return;

    target.paused = true;
    const marker = this.add
      .text(target.body.x, target.body.y, "X", {
        fontFamily: "monospace",
        fontSize: "62px",
        fontStyle: "bold",
        color: "#ff2020",
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.time.delayedCall(1000, () => {
      marker.destroy();
      target.speed *= 1.12;
      target.paused = false;
    });
  }

  private toast(message: string): void {
    const toast = document.createElement("div");
    toast.className = "inventory-toast";
    toast.textContent = message;
    document.querySelector("#app")?.append(toast);
    window.setTimeout(() => toast.remove(), 1600);
  }

  private installStyles(): void {
    if (document.querySelector("#bunker-v16-styles")) return;
    const style = document.createElement("style");
    style.id = "bunker-v16-styles";
    style.textContent = `
      .backpack-panel.has-equipment-column{display:grid!important;grid-template-columns:minmax(0,1fr) 270px!important;grid-template-rows:auto 1fr!important;column-gap:18px!important}.backpack-panel.has-equipment-column header{grid-column:1/3}.backpack-panel.has-equipment-column .backpack-grid{grid-column:1}.backpack-panel.has-equipment-column>.overlay-back{grid-column:2;align-self:end;margin:8px 0 0!important;width:100%}.equipment-column{grid-column:2;grid-row:2;display:flex;flex-direction:column;gap:7px;min-height:0}.equipment-column h3{margin:3px 0;color:#8fe49d;font:800 12px monospace;letter-spacing:.1em}.equipment-slot,.magazine-pouch{min-height:48px;padding:7px;border:2px solid #5f7167;background:#17211c;color:#d9e5dd;font:700 10px monospace;text-align:left}.equipment-slot span,.magazine-pouch span{display:block;color:#83dc92;font-size:9px}.equipment-slot b,.magazine-pouch b{display:block;margin-top:4px}.magazine-pouches{display:grid;grid-template-columns:1fr 1fr;gap:7px}.durability-readout{padding:8px;border:1px solid #5d6f65;background:#101713;color:#e5b95d;font:800 12px monospace}.magazine-maintenance-icon{font-size:58px;color:#9ba69f}
      .tactile-maintenance{position:relative}.selected-tool{position:absolute;left:50%;top:8%;transform:translateX(-50%);z-index:4;min-width:150px;padding:10px 16px;border:2px solid #91a59a;background:#17201c;color:#eff9f1;text-align:center;font:900 13px monospace;box-shadow:0 5px 20px #0008}.selected-tool[data-selected-tool="spray"]:before{content:"▰ ";color:#b9c5be}.selected-tool[data-selected-tool="brush"]:before{content:"▥ ";color:#d5c18f}.selected-tool[data-selected-tool="stone"]:before{content:"◆ ";color:#9ca3af}.maintenance-object{position:absolute;left:10%;right:10%;top:20%;height:45%;border:4px solid #67756d;background:radial-gradient(circle,#3b4640,#101613 72%);touch-action:none;overflow:hidden}.maintenance-object.knife{clip-path:polygon(4% 42%,76% 20%,96% 38%,75% 59%,4% 60%)}.maintenance-object.magazine{left:35%;right:35%;clip-path:polygon(15% 0,85% 0,100% 100%,0 100%)}.maintenance-surface{position:absolute;inset:0;display:grid;grid-template-columns:repeat(${MAINTENANCE_SEGMENTS},1fr)}.maintenance-surface i{display:block;background:linear-gradient(90deg,rgba(118,64,28,calc(1 - var(--clean))),rgba(221,227,223,var(--clean)));transition:background .12s}.maintenance-surface i.is-sprayed{filter:brightness(.78) saturate(.7);box-shadow:inset 0 0 8px #9eb1a888}.maintenance-effects{position:absolute;inset:0;pointer-events:none}.maintenance-particle{position:absolute;width:5px;height:5px;border-radius:50%;animation:maintenance-particle .5s ease-out forwards}.maintenance-particle.mist{background:#dbe9e2aa;filter:blur(1px)}.maintenance-particle.spark{background:#ffe4a0;box-shadow:0 0 7px #fff}.maintenance-tools{position:absolute;left:10%;right:10%;bottom:19%;display:flex;justify-content:center;gap:10px}.maintenance-tools button{padding:11px 15px;border:2px solid #65766d;background:#1b2720;color:#dce7df;font:800 12px monospace}.maintenance-tools button.is-selected{border-color:#8be99a;background:#294932}.maintenance-meter{position:absolute;left:16%;right:16%;bottom:11%;display:grid;grid-template-columns:110px 70px 1fr;align-items:center;gap:10px;color:#e7efe9;font:800 12px monospace}.maintenance-meter div{height:14px;border:1px solid #68776e;background:#101612}.maintenance-meter div i{display:block;height:100%;background:#74d886}.tactile-maintenance>.workstation-back{position:absolute;right:4%;bottom:4%}@keyframes maintenance-particle{to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
      @media(max-height:520px){.backpack-panel.has-equipment-column{grid-template-columns:minmax(0,1fr) 230px!important}.maintenance-object{top:19%;height:42%}.maintenance-tools{bottom:20%}.maintenance-meter{bottom:11%}}
    `;
    document.head.append(style);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => style.remove());
  }
}

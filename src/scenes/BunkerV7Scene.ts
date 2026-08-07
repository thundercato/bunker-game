import Phaser from "phaser";
import { BunkerV6Scene as BaseBunkerV6Scene } from "./BunkerV6Scene";

const VERSION = "0.7.00";
const KNIFE_SPEED = 360;
const KNIFE_MAX_DISTANCE = 820;

type ItemId = "cigarettes" | "jerky" | "knife";
type InventoryItem = {
  id: ItemId;
  name: string;
  description: string;
  details: string;
  stats: string[];
  slot: number;
  taken: boolean;
};

type Runtime = {
  player: Phaser.Physics.Arcade.Sprite;
  walls: Phaser.Physics.Arcade.StaticGroup;
  props: Phaser.Physics.Arcade.StaticGroup;
  direction: "down" | "up" | "left" | "right";
  keys: Record<string, Phaser.Input.Keyboard.Key>;
  uiOpen: boolean;
  interactionHeld: boolean;
  promptLabel: Phaser.GameObjects.Text;
  nearbyInteraction: () => "bunk" | "storage" | "weapons" | null;
  tryInteract: () => void;
  handleInteraction: () => void;
};

type KnifeLocation = "storage" | "backpack" | "armed" | "world";

export class BunkerV6Scene extends BaseBunkerV6Scene {
  private backpackButton!: HTMLButtonElement;
  private overlay!: HTMLElement;
  private controls!: HTMLElement;
  private knifeLocation: KnifeLocation = "storage";
  private knifeSharpness = 15;
  private knifeSprite: Phaser.Physics.Arcade.Sprite | undefined;
  private throwStart = new Phaser.Math.Vector2();
  private knifeFlying = false;
  private attackHeld = false;
  private throwHeld = false;
  private readonly backpack = new Map<ItemId, InventoryItem>();
  private readonly knife: InventoryItem = {
    id: "knife",
    name: "UTILITY KNIFE",
    description: "A heavy bunker utility knife with a worn black handle.",
    details:
      "Balanced well enough to throw, although every impact takes its toll on the edge.",
    stats: ["Sharpness: 50", "Stab: A", "Throw: Y", "Weight: 0.45 kg"],
    slot: 5,
    taken: false,
  };

  public override create(): void {
    super.create();
    this.installStyles();
    this.overlay = this.requireElement<HTMLElement>(".game-overlay");
    this.controls = this.requireElement<HTMLElement>(".touch-controls");
    this.makeBackpackButton();
    this.makeKnifeTexture();
    this.updateVersionLabels();

    const runtime = this.runtime();
    runtime.handleInteraction = this.handleInteractionV7;

    window.addEventListener("bunker-storage-open", this.captureStorage, true);
    window.addEventListener("bunker-take-item", this.captureTakeItem, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        "bunker-storage-open",
        this.captureStorage,
        true,
      );
      window.removeEventListener(
        "bunker-take-item",
        this.captureTakeItem,
        true,
      );
      this.backpackButton.remove();
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.updateKnife(delta);
    this.handleWeaponInput();
  }

  private runtime(): Runtime {
    return this as unknown as Runtime;
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }

  private updateVersionLabels(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
    const gateText = this.runtime().promptLabel.scene.children.list.find(
      (child): child is Phaser.GameObjects.Text =>
        child instanceof Phaser.GameObjects.Text &&
        child.text.startsWith("BUNKER v"),
    );
    if (gateText) gateText.setText(`BUNKER v${VERSION}`);
  }

  private makeBackpackButton(): void {
    const button = document.createElement("button");
    button.className = "backpack-button";
    button.type = "button";
    button.setAttribute("aria-label", "Open backpack");
    button.innerHTML = `<span>🎒</span><small>PACK</small>`;
    button.addEventListener("click", () => this.openBackpack());
    document.querySelector("#app")?.append(button);
    this.backpackButton = button;
  }

  private captureStorage = (event: Event): void => {
    event.stopImmediatePropagation();
    const detail = (event as CustomEvent<{ items: InventoryItem[] }>).detail;
    const items = detail.items.map((item) => ({ ...item }));
    if (this.knifeLocation === "storage") items.push({ ...this.knife });
    this.openStorage(items);
  };

  private captureTakeItem = (event: Event): void => {
    const detail = (event as CustomEvent<{ id: ItemId }>).detail;
    if (detail.id !== "knife") return;
    event.stopImmediatePropagation();
    this.takeKnife();
  };

  private setUiOpen(open: boolean): void {
    this.runtime().uiOpen = open;
    this.controls.classList.toggle("is-hidden", open);
    this.backpackButton.classList.toggle("is-hidden", open);
    this.overlay.classList.toggle("is-open", open);
    if (!open) this.overlay.replaceChildren();
  }

  private closeUi = (): void => {
    this.setUiOpen(false);
    window.dispatchEvent(new Event("bunker-storage-close"));
  };

  private openStorage(items: InventoryItem[]): void {
    this.setUiOpen(true);
    const panel = document.createElement("div");
    panel.className = "storage-panel inventory-panel-v7";
    panel.innerHTML = `<header><h2>STORAGE TRUNK</h2><p>6 × 3 storage grid</p></header><div class="storage-grid"></div><button class="overlay-back">BACK</button>`;
    const grid = panel.querySelector<HTMLElement>(".storage-grid");
    if (!grid) throw new Error("Storage grid missing");
    for (let slot = 0; slot < 18; slot += 1) {
      const item = items.find(
        (candidate) => candidate.slot === slot && !candidate.taken,
      );
      const cell = document.createElement("button");
      cell.className = `storage-cell${item ? " has-item" : ""}`;
      cell.disabled = !item;
      if (item) {
        cell.innerHTML = `${this.itemGlyph(item.id)}<span>${this.itemShortName(item.id)}</span>`;
        cell.addEventListener("click", () => this.openStorageItem(item, items));
      }
      grid.append(cell);
    }
    panel
      .querySelector(".overlay-back")
      ?.addEventListener("click", this.closeUi);
    this.overlay.replaceChildren(panel);
  }

  private openStorageItem(item: InventoryItem, items: InventoryItem[]): void {
    const panel = this.itemPanel(item, "storage");
    const take = panel.querySelector<HTMLButtonElement>(".take-item");
    take?.addEventListener("click", () => {
      if (item.id === "knife") {
        this.takeKnife();
      } else {
        this.backpack.set(item.id, { ...item, taken: true });
        window.dispatchEvent(
          new CustomEvent("bunker-take-item", { detail: { id: item.id } }),
        );
      }
      this.openStorage(items.filter((candidate) => candidate.id !== item.id));
    });
    panel
      .querySelector(".item-back")
      ?.addEventListener("click", () => this.openStorage(items));
    this.overlay.replaceChildren(panel);
  }

  private takeKnife(): void {
    this.knifeLocation = "backpack";
    this.knife.taken = true;
    this.backpack.set("knife", this.currentKnifeItem());
    this.destroyWorldKnife();
  }

  private openBackpack(): void {
    if (this.runtime().uiOpen) return;
    this.setUiOpen(true);
    const panel = document.createElement("div");
    panel.className = "backpack-panel inventory-panel-v7";
    panel.innerHTML = `<header><h2>BACKPACK</h2><p>3 × 4 carried inventory</p></header><div class="backpack-grid"></div><button class="overlay-back">BACK</button>`;
    const grid = panel.querySelector<HTMLElement>(".backpack-grid");
    if (!grid) throw new Error("Backpack grid missing");
    const items = Array.from(this.backpack.values());
    for (let slot = 0; slot < 12; slot += 1) {
      const item = items[slot];
      const cell = document.createElement("button");
      cell.className = `storage-cell${item ? " has-item" : ""}`;
      cell.disabled = !item;
      if (item) {
        cell.innerHTML = `${this.itemGlyph(item.id)}<span>${this.itemShortName(item.id)}</span>`;
        cell.addEventListener("click", () => this.openBackpackItem(item));
      }
      grid.append(cell);
    }
    panel
      .querySelector(".overlay-back")
      ?.addEventListener("click", this.closeUi);
    this.overlay.replaceChildren(panel);
  }

  private openBackpackItem(item: InventoryItem): void {
    const panel = this.itemPanel(item, "backpack");
    const actions = panel.querySelector<HTMLElement>(".item-actions");
    if (!actions) throw new Error("Item actions missing");
    actions.replaceChildren();

    if (item.id === "knife") {
      const arm = this.actionButton(
        this.knifeLocation === "armed" ? "ARMED" : "ARM",
      );
      arm.disabled = this.knifeLocation === "armed";
      arm.addEventListener("click", () => {
        this.knifeLocation = "armed";
        this.backpack.set("knife", this.currentKnifeItem());
        this.closeUi();
        this.showToast("KNIFE ARMED · A STAB · Y THROW");
      });
      actions.append(arm);
    }

    const drop = this.actionButton("DROP");
    drop.addEventListener("click", () => {
      this.backpack.delete(item.id);
      if (item.id === "knife") {
        this.knifeLocation = "world";
        this.spawnWorldKnife(false);
      }
      this.closeUi();
    });
    const back = this.actionButton("BACK");
    back.addEventListener("click", () => this.openBackpack());
    actions.append(drop, back);
    this.overlay.replaceChildren(panel);
  }

  private itemPanel(
    item: InventoryItem,
    source: "storage" | "backpack",
  ): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "item-panel inventory-item-v7";
    const stats =
      item.id === "knife" ? this.currentKnifeItem().stats : item.stats;
    panel.innerHTML = `
      <header><h2>${item.name}</h2><p>${item.description}</p></header>
      <div class="item-art ${item.id}-art-v7"><span>${this.itemGlyph(item.id)}</span></div>
      <div class="item-info"><p>${item.details}</p><ul>${stats.map((stat) => `<li>${stat}</li>`).join("")}</ul></div>
      <div class="item-actions">${source === "storage" ? '<button class="take-item">TAKE</button>' : ""}<button class="item-back">BACK</button></div>`;
    return panel;
  }

  private actionButton(label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    return button;
  }

  private itemGlyph(id: ItemId): string {
    if (id === "cigarettes") return "▥";
    if (id === "jerky") return "▰";
    return "🔪";
  }

  private itemShortName(id: ItemId): string {
    if (id === "cigarettes") return "CIGS";
    if (id === "jerky") return "JERKY";
    return "KNIFE";
  }

  private currentKnifeItem(): InventoryItem {
    return {
      ...this.knife,
      stats: [
        `Sharpness: ${this.knifeSharpness}`,
        "Stab: A",
        "Throw: Y",
        "Weight: 0.45 kg",
      ],
      taken: true,
    };
  }

  private makeKnifeTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x2b2118).fillRoundedRect(1, 12, 11, 8, 2);
    graphics.fillStyle(0xc8d0ce).fillTriangle(10, 10, 31, 16, 10, 22);
    graphics.lineStyle(1, 0x64706e).lineBetween(12, 16, 28, 16);
    graphics.generateTexture("knife-v7", 32, 32);
    graphics.destroy();
  }

  private handleInteractionV7 = (): void => {
    const runtime = this.runtime();
    const gamepad = this.currentGamepad();
    const pressed =
      runtime.keys.E.isDown ||
      runtime.keys.SPACE.isDown ||
      (gamepad?.buttons[2]?.pressed ?? false);
    if (pressed && !runtime.interactionHeld) {
      if (this.canRetrieveKnife()) this.retrieveKnife();
      else runtime.tryInteract();
    }
    runtime.interactionHeld = pressed;

    if (this.canRetrieveKnife()) {
      runtime.promptLabel.setText("USE / X  PICK UP KNIFE").setVisible(true);
      return;
    }
    const nearby = runtime.nearbyInteraction();
    if (!nearby) {
      runtime.promptLabel.setVisible(false);
      return;
    }
    const labels = {
      bunk: "BUNK",
      storage: "STORAGE TRUNK",
      weapons: "WEAPON STATION",
    } as const;
    runtime.promptLabel.setText(`USE / X  ${labels[nearby]}`).setVisible(true);
  };

  private handleWeaponInput(): void {
    const runtime = this.runtime();
    if (runtime.uiOpen || this.knifeLocation !== "armed") {
      this.attackHeld = false;
      this.throwHeld = false;
      return;
    }
    const gamepad = this.currentGamepad();
    const attack = gamepad?.buttons[0]?.pressed ?? false;
    const throwing = gamepad?.buttons[3]?.pressed ?? false;
    if (attack && !this.attackHeld) this.stab();
    if (throwing && !this.throwHeld) this.throwKnife();
    this.attackHeld = attack;
    this.throwHeld = throwing;
  }

  private stab(): void {
    const runtime = this.runtime();
    const vector = this.directionVector();
    const slash = this.add
      .image(
        runtime.player.x + vector.x * 34,
        runtime.player.y + vector.y * 34,
        "knife-v7",
      )
      .setDepth(30)
      .setRotation(Math.atan2(vector.y, vector.x));
    this.tweens.add({
      targets: slash,
      x: slash.x + vector.x * 22,
      y: slash.y + vector.y * 22,
      alpha: 0,
      duration: 150,
      onComplete: () => slash.destroy(),
    });
    this.knifeSharpness = Math.max(0, this.knifeSharpness - 3);
    this.backpack.set("knife", this.currentKnifeItem());
  }

  private throwKnife(): void {
    this.backpack.delete("knife");
    this.knifeLocation = "world";
    this.spawnWorldKnife(true);
  }

  private spawnWorldKnife(flying: boolean): void {
    this.destroyWorldKnife();
    const runtime = this.runtime();
    const vector = this.directionVector();
    const knife = this.physics.add
      .sprite(
        runtime.player.x + vector.x * 34,
        runtime.player.y + vector.y * 34,
        "knife-v7",
      )
      .setDepth(24)
      .setRotation(Math.atan2(vector.y, vector.x));
    const body = knife.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 12).setAllowGravity(false);
    this.knifeSprite = knife;
    this.throwStart.set(knife.x, knife.y);
    this.knifeFlying = flying;
    if (flying)
      body.setVelocity(vector.x * KNIFE_SPEED, vector.y * KNIFE_SPEED);
    else body.setVelocity(0, 0);

    this.physics.add.collider(knife, runtime.walls, () => this.stickKnife());
    this.physics.add.collider(knife, runtime.props, () => this.stickKnife());
  }

  private updateKnife(_delta: number): void {
    const knife = this.knifeSprite;
    if (!knife || !this.knifeFlying) return;
    const travelled = Phaser.Math.Distance.Between(
      this.throwStart.x,
      this.throwStart.y,
      knife.x,
      knife.y,
    );
    if (travelled >= KNIFE_MAX_DISTANCE) this.dropFlyingKnife();
  }

  private stickKnife(): void {
    if (!this.knifeSprite || !this.knifeFlying) return;
    const body = this.knifeSprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setImmovable(true);
    this.knifeFlying = false;
    this.knifeSharpness = Math.max(0, this.knifeSharpness - 3);
  }

  private dropFlyingKnife(): void {
    if (!this.knifeSprite) return;
    const body = this.knifeSprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.knifeFlying = false;
    this.knifeSharpness = Math.max(0, this.knifeSharpness - 3);
  }

  private canRetrieveKnife(): boolean {
    const knife = this.knifeSprite;
    if (!knife || this.knifeFlying) return false;
    const player = this.runtime().player;
    return (
      Phaser.Math.Distance.Between(player.x, player.y, knife.x, knife.y) < 78
    );
  }

  private retrieveKnife(): void {
    this.destroyWorldKnife();
    this.knifeLocation = "backpack";
    this.backpack.set("knife", this.currentKnifeItem());
    this.showToast("KNIFE RECOVERED");
  }

  private destroyWorldKnife(): void {
    this.knifeSprite?.destroy();
    this.knifeSprite = undefined;
    this.knifeFlying = false;
  }

  private directionVector(): Phaser.Math.Vector2 {
    const direction = this.runtime().direction;
    if (direction === "up") return new Phaser.Math.Vector2(0, -1);
    if (direction === "down") return new Phaser.Math.Vector2(0, 1);
    if (direction === "left") return new Phaser.Math.Vector2(-1, 0);
    return new Phaser.Math.Vector2(1, 0);
  }

  private currentGamepad(): Gamepad | null {
    return (
      Array.from(navigator.getGamepads()).find(
        (pad): pad is Gamepad => pad !== null,
      ) ?? null
    );
  }

  private showToast(message: string): void {
    const toast = document.createElement("div");
    toast.className = "inventory-toast";
    toast.textContent = message;
    document.querySelector("#app")?.append(toast);
    window.setTimeout(() => toast.remove(), 2200);
  }

  private installStyles(): void {
    if (document.querySelector("#inventory-v7-styles")) return;
    const style = document.createElement("style");
    style.id = "inventory-v7-styles";
    style.textContent = `
      .backpack-button{position:absolute;z-index:42;top:max(18px,env(safe-area-inset-top));left:max(18px,env(safe-area-inset-left));width:74px;height:72px;border:2px solid #738b77;border-radius:16px;background:rgba(12,24,17,.9);color:#d8f7de;font:800 11px/1 monospace;display:grid;place-items:center;gap:2px;box-shadow:inset 0 0 18px rgba(98,185,114,.16)}
      .backpack-button span{font-size:30px}.backpack-button small{font:800 10px/1 monospace;letter-spacing:.12em}.backpack-button.is-hidden{display:none}
      .backpack-grid{display:grid;grid-template-columns:repeat(3,92px);grid-template-rows:repeat(4,92px);gap:13px;justify-content:center;margin:22px auto}
      .inventory-panel-v7{max-height:92vh;overflow:auto}.inventory-item-v7 .item-art{display:grid;place-items:center;font-size:112px}.knife-art-v7{background:radial-gradient(circle,#46524d 0,#111817 68%)}
      .inventory-toast{position:absolute;z-index:90;left:50%;bottom:22%;transform:translateX(-50%);padding:12px 18px;border:2px solid #72d485;background:rgba(5,13,8,.94);color:#baffc6;font:800 14px/1 monospace;letter-spacing:.08em;pointer-events:none}
      .item-actions button:disabled{opacity:.45}
    `;
    document.head.append(style);
  }
}

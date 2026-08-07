import Phaser from "phaser";
import { BunkerV16Scene } from "./BunkerV16Scene";
import {
  CONSUMABLES,
  ConsumableStore,
  type ConsumableDefinition,
} from "@/systems/ConsumableSystem";

const VERSION = "0.1.0.12";
const FAUCET_POSITION = { x: 560, y: 176 } as const;
const FAUCET_RANGE = 82;
const FILL_DURATION_MS = 2000;

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
  hunger: number;
  thirst: number;
  emitState: () => void;
  backpack: Map<string, BaseItem>;
  openBackpack: () => void;
  reloadFromPouch: () => void;
  switchV9Weapon: () => void;
};

export class BunkerV17Scene extends BunkerV16Scene {
  private readonly consumables = new ConsumableStore();
  private readonly carried = new Set<string>();
  private survivalObserver?: MutationObserver;
  private faucet!: Phaser.GameObjects.Container;
  private faucetPrompt!: Phaser.GameObjects.Text;
  private filling = false;
  private interactHeld = false;
  private keyboardInteract?: Phaser.Input.Keyboard.Key;
  private waterSound?: AudioContext;

  public override create(): void {
    window.addEventListener(
      "bunker-storage-open",
      this.injectConsumables,
      true,
    );
    window.addEventListener(
      "bunker-take-item",
      this.captureTakenConsumable,
      true,
    );
    super.create();
    this.updateVersion();
    this.createFaucet();
    this.createReloadButton();
    this.createWeaponSwitchButton();
    this.installSurvivalStyles();
    this.observePanels();
    this.keyboardInteract = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        "bunker-storage-open",
        this.injectConsumables,
        true,
      );
      window.removeEventListener(
        "bunker-take-item",
        this.captureTakenConsumable,
        true,
      );
      this.survivalObserver?.disconnect();
      document.querySelector(".reload-button")?.remove();
      document.querySelector(".weapon-switch-button")?.remove();
      document.querySelector("#bunker-v17-styles")?.remove();
      void this.waterSound?.close();
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    const player = this.findPlayerV17();
    if (!player) return;

    if (this.filling) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      return;
    }

    const near =
      Phaser.Math.Distance.Between(
        player.x,
        player.y,
        FAUCET_POSITION.x,
        FAUCET_POSITION.y,
      ) <= FAUCET_RANGE;
    this.faucetPrompt.setVisible(near && !this.runtimeV17().uiOpen);

    const gamepadPressed =
      navigator.getGamepads()[0]?.buttons[2]?.pressed ?? false;
    const keyboardPressed = this.keyboardInteract?.isDown ?? false;
    const pressed = gamepadPressed || keyboardPressed;
    if (near && pressed && !this.interactHeld) void this.fillFlask();
    this.interactHeld = pressed;
  }

  private runtimeV17(): Runtime {
    return this as unknown as Runtime;
  }

  private updateVersion(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  private readonly injectConsumables = (event: Event): void => {
    const detail = (event as CustomEvent<{ items: BaseItem[] }>).detail;
    const occupied = new Set(detail.items.map((item) => item.id));
    const usedSlots = new Set(detail.items.map((item) => item.slot));
    const definitions = this.storageDefinitions();
    for (const [definition, preferredSlot] of definitions) {
      if (occupied.has(definition.id)) continue;
      const slot = usedSlots.has(preferredSlot)
        ? Array.from({ length: 18 }, (_, candidate) => candidate).find(
            (candidate) =>
              !usedSlots.has(candidate) &&
              ![7, 8, 9, 10, 11, 12].includes(candidate),
          )
        : preferredSlot;
      if (slot === undefined) continue;
      const state = this.consumables.get(definition.id);
      if (state.quantity <= 0 || this.carried.has(definition.id)) continue;
      detail.items.push(this.toBaseItem(definition, slot, false));
      usedSlots.add(slot);
    }
  };

  private readonly captureTakenConsumable = (event: Event): void => {
    const id = (event as CustomEvent<{ id: string }>).detail.id;
    if (!this.definitionById(id)) return;
    this.carried.add(id);
    this.playInventoryTick();
  };

  private storageDefinitions(): Array<[ConsumableDefinition, number]> {
    const definitions = [
      CONSUMABLES.flask,
      CONSUMABLES.cola,
      CONSUMABLES.orangePop,
      CONSUMABLES.beans,
      CONSUMABLES.energyBar,
      CONSUMABLES.crisps,
      CONSUMABLES.chocolate,
      CONSUMABLES.apple,
      CONSUMABLES.ration,
      CONSUMABLES.crackers,
      CONSUMABLES.peaches,
      CONSUMABLES.soup,
      CONSUMABLES.jerkyFood,
    ];
    const reserved = new Set([7, 8, 9, 10, 11, 12]);
    const slots = Array.from({ length: 18 }, (_, slot) => slot).filter(
      (slot) => !reserved.has(slot),
    );
    return definitions
      .slice(0, slots.length)
      .map((definition, index) => [definition, slots[index]!]);
  }

  private toBaseItem(
    definition: ConsumableDefinition,
    slot: number,
    taken: boolean,
  ): BaseItem {
    const state = this.consumables.get(definition.id);
    const liquidText =
      definition.kind === "liquid-container"
        ? `${Math.round(state.fillPercent ?? 0)}% · ${(state.fillPercent ?? 0) > 0 ? "CLEAN WATER" : "EMPTY"}`
        : `HUNGER +${definition.hungerRestored}`;
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      details: liquidText,
      stats: [
        `WEIGHT ${definition.weightKg.toFixed(2)} KG`,
        `QUANTITY ${state.quantity}/${definition.stackSize}`,
        `CALORIES ${definition.calories}`,
        `SPOILAGE ${definition.spoilable ? "FUTURE ENABLED" : "STABLE"}`,
        `HYDRATION ${definition.hydrationRestored >= 0 ? "+" : ""}${definition.hydrationRestored}`,
      ],
      slot,
      taken,
    };
  }

  private definitionById(id: string): ConsumableDefinition | undefined {
    return Object.values(CONSUMABLES).find(
      (definition) => definition.id === id,
    );
  }

  private observePanels(): void {
    const overlay = document.querySelector<HTMLElement>(".game-overlay");
    if (!overlay) return;
    this.survivalObserver = new MutationObserver(() =>
      this.decorateConsumablePanel(),
    );
    this.survivalObserver.observe(overlay, { childList: true, subtree: true });
  }

  private decorateConsumablePanel(): void {
    const panel = document.querySelector<HTMLElement>(".firearm-item-panel");
    const title = panel?.querySelector("h2")?.textContent?.trim();
    const actions = panel?.querySelector<HTMLElement>(".item-actions");
    if (
      !panel ||
      !title ||
      !actions ||
      panel.dataset.consumableDecorated === "true"
    )
      return;
    const definition = Object.values(CONSUMABLES).find(
      (item) => item.name === title,
    );
    if (!definition) return;
    panel.dataset.consumableDecorated = "true";

    const state = this.consumables.get(definition.id);
    const info = panel.querySelector<HTMLElement>(".item-info");
    if (definition.kind === "liquid-container" && info) {
      info.insertAdjacentHTML(
        "afterbegin",
        `<div class="liquid-readout"><strong>CONTENTS</strong><span>${Math.round(state.fillPercent ?? 0)}%</span><small>${(state.fillPercent ?? 0) > 0 ? "CLEAN WATER" : "EMPTY"}</small></div>`,
      );
    }

    const inBackpack = this.runtimeV17().backpack.has(definition.id);
    const button = document.createElement("button");
    button.className = "consume-action";
    button.textContent = definition.kind === "food" ? "EAT" : "DRINK";
    button.addEventListener("click", () => {
      if (definition.kind === "food") void this.eat(definition, inBackpack);
      else if (definition.kind === "drink")
        void this.drinkPackaged(definition, inBackpack);
      else void this.drinkFlask(inBackpack);
    });
    actions.prepend(button);
  }

  private async drinkFlask(inBackpack = true): Promise<void> {
    void inBackpack;
    const runtime = this.runtimeV17();
    const state = this.consumables.get("flask");
    const fill = state.fillPercent ?? 0;
    if (runtime.thirst >= 100) {
      this.toastV17("Not thirsty.");
      return;
    }
    if (fill <= 0) {
      this.toastV17("The flask is empty.");
      return;
    }

    const used = Math.min(100 - runtime.thirst, fill);
    await this.animateConsumption("drink", used, (progress) => {
      runtime.thirst = Math.min(100, runtime.thirst + used * progress);
      runtime.emitState();
    });
    this.consumables.setFlaskFill(fill - used);
    this.pulseNeed("thirst");
    this.playInventoryTick();
    if (inBackpack) runtime.openBackpack();
    else document.querySelector<HTMLButtonElement>(".item-back")?.click();
  }

  private async eat(
    definition: ConsumableDefinition,
    inBackpack = true,
  ): Promise<void> {
    void inBackpack;
    const runtime = this.runtimeV17();
    if (runtime.hunger >= 100) {
      this.toastV17("Not hungry.");
      return;
    }
    const state = this.consumables.get(definition.id);
    if (state.quantity <= 0) return;
    const servings = definition.servingsPerItem ?? 1;
    const restored = Math.min(
      100 - runtime.hunger,
      definition.hungerRestored / servings,
    );
    const hydrationDelta = Math.max(
      -runtime.thirst,
      Math.min(100 - runtime.thirst, definition.hydrationRestored),
    );
    await this.animateConsumption("eat", restored, (progress) => {
      runtime.hunger = Math.min(100, runtime.hunger + restored * progress);
      runtime.thirst = Math.max(
        0,
        Math.min(100, runtime.thirst + hydrationDelta * progress),
      );
      runtime.emitState();
    });
    this.consumables.consumeServing(
      definition.id,
      definition.servingsPerItem ?? 1,
    );
    const remaining = this.consumables.get(definition.id).quantity;
    if (remaining <= 0) {
      runtime.backpack.delete(definition.id);
      this.carried.delete(definition.id);
    }
    this.pulseNeed("hunger");
    this.playInventoryTick();
    runtime.openBackpack();
  }

  private async drinkPackaged(
    definition: ConsumableDefinition,
    inBackpack = true,
  ): Promise<void> {
    void inBackpack;
    const runtime = this.runtimeV17();
    if (runtime.thirst >= 100) {
      const toast = (this as unknown as { toast: (message: string) => void })
        .toast;
      toast.call(this, "Not thirsty.");
      return;
    }
    const state = this.consumables.get(definition.id);
    if (state.quantity <= 0) return;
    const hydration = Math.min(
      100 - runtime.thirst,
      definition.hydrationRestored,
    );
    const hunger = Math.min(100 - runtime.hunger, definition.hungerRestored);
    await this.animateConsumption("drink", hydration, (progress) => {
      runtime.thirst = Math.min(100, runtime.thirst + hydration * progress);
      runtime.hunger = Math.min(100, runtime.hunger + hunger * progress);
      runtime.emitState();
    });
    this.consumables.consumeOne(definition.id);
    if (this.consumables.get(definition.id).quantity <= 0) {
      runtime.backpack.delete(definition.id);
      this.carried.delete(definition.id);
    }
    this.pulseNeed("thirst");
    this.playInventoryTick();
    if (inBackpack) runtime.openBackpack();
    else document.querySelector<HTMLButtonElement>(".item-back")?.click();
  }

  private async animateConsumption(
    type: "drink" | "eat",
    amount: number,
    update: (progressDelta: number) => void,
  ): Promise<void> {
    const player = this.findPlayerV17();
    if (!player) return;
    const startAngle = player.angle;
    const prop = this.add
      .rectangle(
        player.x + 13,
        player.y - 16,
        type === "drink" ? 7 : 11,
        type === "drink" ? 16 : 7,
        type === "drink" ? 0xa9b7b8 : 0x9a6b32,
      )
      .setDepth(player.depth + 1);
    player.setAngle(type === "drink" ? -5 : 3);
    this.playConsumptionSound(type);

    let previous = 0;
    await new Promise<void>((resolve) => {
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1000,
        ease: "Sine.InOut",
        onUpdate: (tween) => {
          const current = tween.getValue() ?? 0;
          update(current - previous);
          previous = current;
          prop.setPosition(
            player.x + 13,
            player.y - 16 - Math.sin(current * Math.PI) * 7,
          );
        },
        onComplete: () => resolve(),
      });
    });
    player.setAngle(startAngle);
    prop.destroy();
    void amount;
  }

  private createFaucet(): void {
    const pipe = this.add
      .rectangle(0, 0, 22, 42, 0x59666a)
      .setStrokeStyle(2, 0x1c2529);
    const spout = this.add
      .rectangle(17, 7, 31, 9, 0x77868a)
      .setStrokeStyle(2, 0x1c2529);
    const handle = this.add
      .rectangle(0, -25, 35, 7, 0x8a3430)
      .setStrokeStyle(2, 0x321514);
    this.faucet = this.add
      .container(FAUCET_POSITION.x, FAUCET_POSITION.y, [pipe, spout, handle])
      .setDepth(18);
    this.faucet.setSize(65, 74).setInteractive({ useHandCursor: true });
    this.faucet.on("pointerdown", () => {
      const player = this.findPlayerV17();
      if (!player) return;
      const near =
        Phaser.Math.Distance.Between(
          player.x,
          player.y,
          FAUCET_POSITION.x,
          FAUCET_POSITION.y,
        ) <= FAUCET_RANGE;
      if (near) void this.fillFlask();
    });
    this.faucetPrompt = this.add
      .text(FAUCET_POSITION.x, FAUCET_POSITION.y + 52, "X / USE · FILL FLASK", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d9f5ff",
        backgroundColor: "#071014dd",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setVisible(false);
  }

  private async fillFlask(): Promise<void> {
    const runtime = this.runtimeV17();
    if (runtime.uiOpen || this.filling) return;
    if (!runtime.backpack.has("flask")) {
      this.toastV17("You need the water flask.");
      return;
    }
    if ((this.consumables.get("flask").fillPercent ?? 0) >= 100) {
      this.toastV17("Already full.");
      return;
    }

    this.filling = true;
    const stream = this.add
      .rectangle(
        FAUCET_POSITION.x + 31,
        FAUCET_POSITION.y + 28,
        4,
        0,
        0x8ddcff,
        0.8,
      )
      .setOrigin(0.5, 0)
      .setDepth(22);
    const flask = this.add
      .rectangle(
        FAUCET_POSITION.x + 31,
        FAUCET_POSITION.y + 65,
        14,
        24,
        0x879597,
      )
      .setStrokeStyle(2, 0x222b2e)
      .setDepth(23);
    this.startWaterSound();
    this.tweens.add({ targets: stream, displayHeight: 35, duration: 220 });

    const particles = this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        const drop = this.add
          .circle(
            FAUCET_POSITION.x + 31 + Phaser.Math.Between(-5, 5),
            FAUCET_POSITION.y + 58,
            2,
            0xa8e9ff,
            0.8,
          )
          .setDepth(24);
        this.tweens.add({
          targets: drop,
          x: drop.x + Phaser.Math.Between(-12, 12),
          y: drop.y + 12,
          alpha: 0,
          duration: 260,
          onComplete: () => drop.destroy(),
        });
      },
    });

    await new Promise<void>((resolve) =>
      this.time.delayedCall(FILL_DURATION_MS, resolve),
    );
    particles.remove(false);
    this.stopWaterSound();
    stream.destroy();
    flask.destroy();
    this.consumables.setFlaskFill(100);
    this.playInventoryTick();
    this.toastV17("Flask filled with clean water.");
    this.filling = false;
  }

  private createReloadButton(): void {
    const parent = document.querySelector<HTMLElement>("#app");
    const backpack = parent?.querySelector<HTMLElement>(".backpack-button");
    if (!parent || !backpack || parent.querySelector(".reload-button")) return;
    const button = document.createElement("button");
    button.className = "reload-button";
    button.textContent = "RELOAD";
    button.setAttribute("aria-label", "Reload from magazine pouch");
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.runtimeV17().reloadFromPouch();
    });
    parent.append(button);
  }

  private createWeaponSwitchButton(): void {
    const parent = document.querySelector<HTMLElement>("#app");
    if (!parent || parent.querySelector(".weapon-switch-button")) return;
    const button = document.createElement("button");
    button.className = "weapon-switch-button";
    button.textContent = "SWAP";
    button.setAttribute("aria-label", "Switch equipped weapon");
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.runtimeV17().switchV9Weapon();
    });
    parent.append(button);
  }

  private findPlayerV17(): Phaser.Physics.Arcade.Sprite | undefined {
    return this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite &&
        child.texture.key.startsWith("survivor-"),
    );
  }

  private pulseNeed(need: "hunger" | "thirst"): void {
    const row = document
      .querySelector<HTMLElement>(`.survival-hud .${need}-fill`)
      ?.closest(".status-row");
    row?.classList.add("need-pulse");
    window.setTimeout(() => row?.classList.remove("need-pulse"), 650);
  }

  private toastV17(message: string): void {
    window.dispatchEvent(
      new CustomEvent("bunker-toast", { detail: { message } }),
    );
    const toast = document.createElement("div");
    toast.className = "inventory-toast survival-toast";
    toast.textContent = message;
    document.querySelector("#app")?.append(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }

  private playConsumptionSound(type: "drink" | "eat"): void {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type === "drink" ? "sine" : "square";
    oscillator.frequency.setValueAtTime(
      type === "drink" ? 180 : 95,
      context.currentTime,
    );
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.8);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.8);
    window.setTimeout(() => void context.close(), 900);
  }

  private playInventoryTick(): void {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(520, context.currentTime);
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
    window.setTimeout(() => void context.close(), 150);
  }

  private startWaterSound(): void {
    this.waterSound = new AudioContext();
    const oscillator = this.waterSound.createOscillator();
    const gain = this.waterSound.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 120;
    gain.gain.value = 0.018;
    oscillator.connect(gain).connect(this.waterSound.destination);
    oscillator.start();
    (
      this.waterSound as AudioContext & { bunkerOscillator?: OscillatorNode }
    ).bunkerOscillator = oscillator;
  }

  private stopWaterSound(): void {
    const context = this.waterSound as
      (AudioContext & { bunkerOscillator?: OscillatorNode }) | undefined;
    context?.bunkerOscillator?.stop();
    void context?.close();
    this.waterSound = undefined;
  }

  private installSurvivalStyles(): void {
    if (document.querySelector("#bunker-v17-styles")) return;
    const style = document.createElement("style");
    style.id = "bunker-v17-styles";
    style.textContent = `
      .weapon-switch-button{position:absolute;left:max(160px,calc(env(safe-area-inset-left) + 152px));top:max(12px,env(safe-area-inset-top));z-index:90;width:64px;height:42px;border:2px solid #8b806d;border-radius:8px;background:#2b241b;color:#f3e7cd;font:800 11px monospace;touch-action:manipulation}.game-overlay.is-open~.weapon-switch-button,.weapon-switch-button.is-hidden{display:none}.reload-button{position:absolute;left:max(82px,calc(env(safe-area-inset-left) + 74px));top:max(12px,env(safe-area-inset-top));z-index:90;width:72px;height:42px;border:2px solid #74877b;border-radius:8px;background:#16221c;color:#d8efdf;font:800 11px monospace;touch-action:manipulation}.game-overlay.is-open~.reload-button,.reload-button.is-hidden{display:none}.touch-actions{right:max(18px,env(safe-area-inset-right))!important;bottom:max(18px,env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(2,72px)!important;grid-template-rows:repeat(2,58px)!important;gap:10px!important}.touch-actions .touch-use{grid-column:1;grid-row:2}.touch-actions .touch-back{grid-column:2;grid-row:2}.touch-actions .touch-run{grid-column:1;grid-row:1}.touch-actions .touch-attack{grid-column:2;grid-row:1;position:static!important;transform:none!important}.touch-actions .touch-throw{grid-column:2;grid-row:1;position:static!important;transform:translateY(-68px)!important}.liquid-readout{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px;border:1px solid #587268;background:#101a16;color:#dcebe4;font-family:monospace}.liquid-readout small{grid-column:1/3;color:#81c9e7}.consume-action{border-color:#85b892!important;background:#23402d!important}.need-pulse{animation:need-pulse .65s ease-out}.survival-toast{z-index:500!important}@keyframes need-pulse{0%{filter:brightness(1)}35%{filter:brightness(1.9);transform:scale(1.04)}100%{filter:brightness(1);transform:scale(1)}}
    `;
    document.head.append(style);
  }
}

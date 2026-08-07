import Phaser from "phaser";
import { InventoryStore } from "@/inventory/InventoryStore";
import { BunkerV8Scene } from "./BunkerV8Scene";

const VERSION = "0.1.0.2";
const MAGAZINE_CAPACITY = 8;

type FirearmItemId =
  | "makarov"
  | "makarov-mag-1"
  | "makarov-mag-2"
  | "ammo-box-1"
  | "ammo-box-2"
  | "loose-9mm";

type FirearmItem = {
  id: FirearmItemId;
  name: string;
  kind: "pistol" | "magazine" | "ammo";
  slot: number;
  location: "storage" | "backpack" | "gun";
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

type BaseRuntime = {
  uiOpen: boolean;
  knifeLocation: "storage" | "backpack" | "armed" | "world";
  knife: BaseItem;
  backpack: Map<string, BaseItem>;
  currentKnifeItem: () => BaseItem;
};

export class BunkerV9Scene extends BunkerV8Scene {
  private readonly firearmItems = new Map<FirearmItemId, FirearmItem>([
    [
      "makarov",
      {
        id: "makarov",
        name: "MAKAROV PM",
        kind: "pistol",
        slot: 7,
        location: "storage",
        rounds: 0,
      },
    ],
    [
      "makarov-mag-1",
      {
        id: "makarov-mag-1",
        name: "MAKAROV MAGAZINE A",
        kind: "magazine",
        slot: 8,
        location: "storage",
        rounds: 0,
      },
    ],
    [
      "makarov-mag-2",
      {
        id: "makarov-mag-2",
        name: "MAKAROV MAGAZINE B",
        kind: "magazine",
        slot: 9,
        location: "storage",
        rounds: 2,
      },
    ],
    [
      "ammo-box-1",
      {
        id: "ammo-box-1",
        name: "9×18MM AMMO BOX",
        kind: "ammo",
        slot: 10,
        location: "storage",
        rounds: 16,
      },
    ],
    [
      "ammo-box-2",
      {
        id: "ammo-box-2",
        name: "9×18MM AMMO PACKET",
        kind: "ammo",
        slot: 11,
        location: "storage",
        rounds: 6,
      },
    ],
    [
      "loose-9mm",
      {
        id: "loose-9mm",
        name: "LOOSE 9×18MM ROUNDS",
        kind: "ammo",
        slot: 12,
        location: "backpack",
        rounds: 0,
      },
    ],
  ]);

  private v9Overlay!: HTMLElement;
  private v9Controls!: HTMLElement;
  private v9BackpackButton!: HTMLElement;
  private insertedMagazine: FirearmItemId | null = null;
  private chamberedRound = false;
  private pistolArmed = false;
  private fireHeld = false;
  private readonly storageInventory = new InventoryStore<BaseItem>(
    (item) => item.id,
  );

  public override create(): void {
    window.addEventListener("bunker-storage-open", this.captureV9Storage, true);
    document.addEventListener("click", this.captureBackpackClick, true);
    window.addEventListener("bunker-touch-attack", this.captureTouchFire, true);
    super.create();
    this.v9Overlay = this.requireV9Element(".game-overlay");
    this.v9Controls = this.requireV9Element(".touch-controls");
    this.v9BackpackButton = this.requireV9Element(".backpack-button");
    this.updateV9VersionLabels();
    this.installFirearmStyles();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        "bunker-storage-open",
        this.captureV9Storage,
        true,
      );
      document.removeEventListener("click", this.captureBackpackClick, true);
      window.removeEventListener(
        "bunker-touch-attack",
        this.captureTouchFire,
        true,
      );
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    const pressed = navigator.getGamepads()[0]?.buttons[0]?.pressed ?? false;
    if (this.pistolArmed && pressed && !this.fireHeld) this.firePistol();
    this.fireHeld = pressed;
  }

  private runtimeV9(): BaseRuntime {
    return this as unknown as BaseRuntime;
  }
  private requireV9Element(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }

  private updateV9VersionLabels(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  private readonly captureV9Storage = (event: Event): void => {
    event.stopImmediatePropagation();
    const items = (event as CustomEvent<{ items: BaseItem[] }>).detail.items;
    this.storageInventory.replace(items);
    const runtime = this.runtimeV9();
    if (runtime.knifeLocation === "storage") items.push({ ...runtime.knife });
    this.openV9Storage(items);
  };

  private readonly captureBackpackClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(".backpack-button")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!this.runtimeV9().uiOpen) this.openV9Backpack();
  };

  private readonly captureTouchFire = (event: Event): void => {
    if (!this.pistolArmed) return;
    event.stopImmediatePropagation();
    this.firePistol();
  };

  private setV9UiOpen(open: boolean): void {
    this.runtimeV9().uiOpen = open;
    this.v9Controls.classList.toggle("is-hidden", open);
    this.v9BackpackButton.classList.toggle("is-hidden", open);
    this.v9Overlay.classList.toggle("is-open", open);
    if (!open) this.v9Overlay.replaceChildren();
  }

  private closeV9Ui = (): void => {
    this.setV9UiOpen(false);
    window.dispatchEvent(new Event("bunker-storage-close"));
  };

  private openV9Storage(baseItems?: BaseItem[]): void {
    if (baseItems) this.storageInventory.replace(baseItems);
    const currentItems = this.storageInventory.values();
    this.setV9UiOpen(true);
    const panel = document.createElement("div");
    panel.className = "storage-panel firearm-inventory";
    panel.innerHTML = `<header><h2>STORAGE TRUNK</h2><p>6 × 3 storage grid</p></header><div class="storage-grid"></div><button class="overlay-back">BACK</button>`;
    const grid = panel.querySelector<HTMLElement>(".storage-grid");
    if (!grid) throw new Error("Storage grid missing");
    const available = [
      ...currentItems.filter((item) => !item.taken),
      ...Array.from(this.firearmItems.values()).filter(
        (item) => item.location === "storage",
      ),
    ];
    for (let slot = 0; slot < 18; slot += 1) {
      const cell = document.createElement("button");
      cell.className = "storage-cell";
      const base = available.find(
        (item) => "taken" in item && item.slot === slot,
      ) as BaseItem | undefined;
      const firearm = available.find(
        (item) => "location" in item && item.slot === slot,
      ) as FirearmItem | undefined;
      const item = base ?? firearm;
      cell.disabled = !item;
      if (base) {
        cell.classList.add("has-item");
        cell.innerHTML = `${this.baseGlyph(base.id)}<span>${base.name}</span>`;
        cell.addEventListener("click", () => this.openV9BaseItem(base));
      } else if (firearm) {
        cell.classList.add("has-item");
        cell.innerHTML = `${this.firearmGlyph(firearm)}<span>${this.shortName(firearm)}</span>`;
        cell.addEventListener("click", () =>
          this.openFirearmItem(firearm, "storage"),
        );
      }
      grid.append(cell);
    }
    panel
      .querySelector(".overlay-back")
      ?.addEventListener("click", this.closeV9Ui);
    this.v9Overlay.replaceChildren(panel);
  }

  private openV9Backpack(): void {
    this.setV9UiOpen(true);
    const panel = document.createElement("div");
    panel.className = "backpack-panel firearm-inventory";
    panel.innerHTML = `<header><h2>BACKPACK</h2><p>3 × 4 carried inventory</p></header><div class="backpack-grid storage-grid"></div><button class="overlay-back">BACK</button>`;
    const grid = panel.querySelector<HTMLElement>(".backpack-grid");
    if (!grid) throw new Error("Backpack grid missing");

    const carriedEntries = [
      ...Array.from(this.runtimeV9().backpack.values()).map((item) => ({
        type: "base" as const,
        item,
      })),
      ...Array.from(this.firearmItems.values())
        .filter(
          (item) =>
            item.location === "backpack" &&
            (item.kind !== "ammo" || item.rounds > 0),
        )
        .map((item) => ({ type: "firearm" as const, item })),
    ];

    for (let slot = 0; slot < 12; slot += 1) {
      const cell = document.createElement("button");
      cell.className = "storage-cell";
      const entry = carriedEntries[slot];
      cell.disabled = !entry;
      if (entry?.type === "base") {
        const item = entry.item;
        cell.classList.add("has-item");
        cell.innerHTML = `${this.baseGlyph(item.id)}<span>${item.name}</span>`;
        cell.addEventListener("click", () => this.openV9BaseItem(item));
      } else if (entry?.type === "firearm") {
        const item = entry.item;
        cell.classList.add("has-item");
        cell.innerHTML = `${this.firearmGlyph(item)}<span>${this.shortName(item)}</span>`;
        cell.addEventListener("click", () =>
          this.openFirearmItem(item, "backpack"),
        );
      }
      grid.append(cell);
    }
    panel
      .querySelector(".overlay-back")
      ?.addEventListener("click", this.closeV9Ui);
    this.v9Overlay.replaceChildren(panel);
  }

  private openV9BaseItem(item: BaseItem): void {
    const panel = document.createElement("div");
    panel.className = "item-panel firearm-item-panel";
    panel.innerHTML = `<header><h2>${item.name}</h2><p>${item.description}</p></header><div class="firearm-art">${this.baseGlyph(item.id)}</div><div class="item-info"><p>${item.details}</p><ul>${item.stats.map((stat) => `<li>${stat}</li>`).join("")}</ul></div><div class="item-actions"></div>`;
    const actions = panel.querySelector<HTMLElement>(".item-actions");
    if (!actions) throw new Error("Actions missing");
    const runtime = this.runtimeV9();
    const isKnife = item.id === "knife";
    const inStorage = !item.taken;

    if (inStorage) {
      actions.append(
        this.button("TAKE", () => {
          window.dispatchEvent(
            new CustomEvent("bunker-take-item", { detail: { id: item.id } }),
          );
          item.taken = true;
          runtime.backpack.set(item.id, item);
          this.openV9Storage();
        }),
      );
      if (isKnife)
        actions.append(
          this.button("ARM", () => {
            item.taken = true;
            runtime.backpack.set(item.id, item);
            runtime.knifeLocation = "armed";
            this.pistolArmed = false;
            this.closeV9Ui();
            this.toast("KNIFE ARMED · A / WEAPON TO STAB · Y / THROW");
          }),
        );
    } else if (isKnife) {
      const armed = runtime.knifeLocation === "armed";
      actions.append(
        this.button(armed ? "UNARM" : "ARM", () => {
          runtime.knifeLocation = armed ? "backpack" : "armed";
          if (!armed) this.pistolArmed = false;
          this.openV9Backpack();
          this.toast(armed ? "KNIFE RETURNED TO BACKPACK" : "KNIFE ARMED");
        }),
      );
    }

    actions.append(
      this.button("BACK", () =>
        inStorage ? this.openV9Storage() : this.openV9Backpack(),
      ),
    );
    this.v9Overlay.replaceChildren(panel);
  }

  private openFirearmItem(
    item: FirearmItem,
    origin: "storage" | "backpack",
  ): void {
    const panel = document.createElement("div");
    panel.className = "item-panel firearm-item-panel";
    panel.innerHTML = `<header><h2>${item.name}</h2><p>${this.itemDescription(item)}</p></header><div class="firearm-art ${item.kind}">${this.firearmGlyph(item)}</div><div class="item-info"><ul>${this.itemStats(
      item,
    )
      .map((stat) => `<li>${stat}</li>`)
      .join("")}</ul></div><div class="item-actions"></div>`;
    const actions = panel.querySelector<HTMLElement>(".item-actions");
    if (!actions) throw new Error("Actions missing");
    if (origin === "storage") {
      actions.append(
        this.button("TAKE", () => {
          item.location = "backpack";
          this.openV9Storage();
        }),
      );
      if (item.kind === "pistol")
        actions.append(
          this.button("ARM", () => {
            item.location = "backpack";
            this.pistolArmed = true;
            this.runtimeV9().knifeLocation =
              this.runtimeV9().knifeLocation === "armed"
                ? "backpack"
                : this.runtimeV9().knifeLocation;
            this.closeV9Ui();
            this.toast("MAKAROV ARMED");
          }),
        );
    } else this.addBackpackActions(item, actions);
    actions.append(
      this.button("BACK", () =>
        origin === "storage" ? this.openV9Storage() : this.openV9Backpack(),
      ),
    );
    this.v9Overlay.replaceChildren(panel);
  }

  private addBackpackActions(item: FirearmItem, actions: HTMLElement): void {
    if (item.kind === "magazine") {
      actions.append(
        this.button("LOAD MAGAZINE", () => {
          const loaded = this.loadMagazine(item);
          this.toast(
            loaded > 0
              ? `${loaded} ROUND${loaded === 1 ? "" : "S"} LOADED`
              : "NO LOOSE AMMUNITION",
          );
          this.openFirearmItem(item, "backpack");
        }),
      );
      actions.append(
        this.button("UNLOAD BULLETS", () => {
          const removed = item.rounds;
          if (removed > 0) {
            this.looseAmmo().rounds += removed;
            item.rounds = 0;
          }
          this.toast(
            removed > 0 ? `${removed} ROUNDS UNLOADED` : "MAGAZINE EMPTY",
          );
          this.openFirearmItem(item, "backpack");
        }),
      );
    }
    if (item.kind === "ammo") {
      actions.append(
        this.button("REMOVE ONE ROUND", () => {
          if (item.id !== "loose-9mm" && item.rounds > 0) {
            item.rounds -= 1;
            this.looseAmmo().rounds += 1;
          }
          this.openFirearmItem(item, "backpack");
        }),
      );
      actions.append(
        this.button("MERGE AMMO", () => {
          this.mergeAmmoInto(item);
          this.openFirearmItem(item, "backpack");
        }),
      );
    }
    if (item.kind === "pistol") {
      if (this.insertedMagazine)
        actions.append(
          this.button("UNLOAD MAGAZINE", () => {
            const magazine = this.firearmItems.get(this.insertedMagazine!);
            if (magazine) magazine.location = "backpack";
            this.insertedMagazine = null;
            this.openFirearmItem(item, "backpack");
          }),
        );
      else
        actions.append(
          this.button("LOAD MAGAZINE", () => {
            const magazine =
              this.carriedMagazines().find(
                (candidate) => candidate.rounds > 0,
              ) ?? this.carriedMagazines()[0];
            if (magazine) {
              magazine.location = "gun";
              this.insertedMagazine = magazine.id;
            }
            this.openFirearmItem(item, "backpack");
          }),
        );
      actions.append(
        this.button("RACK SLIDE", () => {
          this.rackSlide();
          this.openFirearmItem(item, "backpack");
        }),
      );
      actions.append(
        this.button("UNLOAD CHAMBER", () => {
          if (this.chamberedRound) {
            this.chamberedRound = false;
            this.looseAmmo().rounds += 1;
          }
          this.openFirearmItem(item, "backpack");
        }),
      );
      actions.append(
        this.button(
          this.pistolArmed ? "UNARM" : "ARM",
          () => {
            this.pistolArmed = !this.pistolArmed;
            if (this.pistolArmed)
              this.runtimeV9().knifeLocation =
                this.runtimeV9().knifeLocation === "armed"
                  ? "backpack"
                  : this.runtimeV9().knifeLocation;
            this.openV9Backpack();
            this.toast(
              this.pistolArmed
                ? "MAKAROV ARMED · A / WEAPON TO FIRE"
                : "MAKAROV RETURNED TO BACKPACK",
            );
          },
          this.pistolArmed,
        ),
      );
    }
  }

  public switchV9Weapon(): void {
    if (this.runtimeV9().uiOpen) return;
    const runtime = this.runtimeV9();
    const hasKnife =
      runtime.backpack.has("knife") || runtime.knifeLocation === "armed";
    const pistol = this.firearmItems.get("makarov");
    const hasPistol = pistol?.location === "backpack" || this.pistolArmed;
    if (this.pistolArmed && hasKnife) {
      this.pistolArmed = false;
      runtime.knifeLocation = "armed";
      this.toast("KNIFE READY");
    } else if (runtime.knifeLocation === "armed" && hasPistol) {
      runtime.knifeLocation = "backpack";
      this.pistolArmed = true;
      this.toast("MAKAROV READY");
    } else if (hasPistol) {
      this.pistolArmed = true;
      runtime.knifeLocation =
        runtime.knifeLocation === "armed" ? "backpack" : runtime.knifeLocation;
      this.toast("MAKAROV READY");
    } else if (hasKnife) {
      runtime.knifeLocation = "armed";
      this.pistolArmed = false;
      this.toast("KNIFE READY");
    } else this.toast("NO WEAPON AVAILABLE");
  }

  private loadMagazine(magazine: FirearmItem): number {
    const needed = MAGAZINE_CAPACITY - magazine.rounds;
    if (needed <= 0) return 0;
    let loaded = 0;
    for (const source of this.ammoSources()) {
      while (source.rounds > 0 && loaded < needed) {
        source.rounds -= 1;
        magazine.rounds += 1;
        loaded += 1;
      }
      if (loaded >= needed) break;
    }
    return loaded;
  }

  private rackSlide(): void {
    if (this.chamberedRound) {
      this.looseAmmo().rounds += 1;
      this.chamberedRound = false;
    }
    const magazine = this.insertedMagazine
      ? this.firearmItems.get(this.insertedMagazine)
      : undefined;
    if (magazine && magazine.rounds > 0) {
      magazine.rounds -= 1;
      this.chamberedRound = true;
      this.toast("ROUND CHAMBERED");
    } else this.toast("CLICK · NO ROUND AVAILABLE");
  }

  private firePistol(): void {
    if (!this.pistolArmed || this.runtimeV9().uiOpen) return;
    if (!this.chamberedRound) {
      this.toast("CLICK · CHAMBER EMPTY");
      return;
    }
    this.chamberedRound = false;
    this.cameras.main.shake(80, 0.003);
    navigator.vibrate?.([24, 18, 38]);
    window.dispatchEvent(new Event("bunker-gunshot"));
    const magazine = this.insertedMagazine
      ? this.firearmItems.get(this.insertedMagazine)
      : undefined;
    if (magazine && magazine.rounds > 0) {
      magazine.rounds -= 1;
      this.chamberedRound = true;
    }
  }

  private mergeAmmoInto(target: FirearmItem): void {
    if (target.kind !== "ammo") return;
    for (const source of this.ammoSources()) {
      if (source.id === target.id) continue;
      target.rounds += source.rounds;
      source.rounds = 0;
    }
    this.toast(`${target.rounds} ROUNDS IN PACKET`);
  }
  private ammoSources(): FirearmItem[] {
    return Array.from(this.firearmItems.values()).filter(
      (item) =>
        item.kind === "ammo" && item.location === "backpack" && item.rounds > 0,
    );
  }
  private carriedMagazines(): FirearmItem[] {
    return Array.from(this.firearmItems.values()).filter(
      (item) => item.kind === "magazine" && item.location === "backpack",
    );
  }
  private looseAmmo(): FirearmItem {
    const item = this.firearmItems.get("loose-9mm");
    if (!item) throw new Error("Loose ammunition state missing");
    return item;
  }
  private itemDescription(item: FirearmItem): string {
    if (item.kind === "pistol")
      return "A worn Soviet 9×18mm service pistol. Eight-round magazines only.";
    if (item.kind === "magazine")
      return "A steel single-stack Makarov magazine with visible witness holes.";
    return "9×18mm Makarov cartridges kept together as a physical ammunition packet.";
  }
  private itemStats(item: FirearmItem): string[] {
    if (item.kind === "pistol") {
      const magazine = this.insertedMagazine
        ? this.firearmItems.get(this.insertedMagazine)
        : undefined;
      return [
        `Magazine: ${magazine ? `${magazine.rounds}/${MAGAZINE_CAPACITY}` : "Not inserted"}`,
        `Chamber: ${this.chamberedRound ? "Loaded" : "Empty"}`,
        `Status: ${this.pistolArmed ? "Armed" : "Stored"}`,
      ];
    }
    if (item.kind === "magazine")
      return [`Rounds: ${item.rounds}/${MAGAZINE_CAPACITY}`, "Calibre: 9×18mm"];
    return [`Rounds in packet: ${item.rounds}`, "Calibre: 9×18mm"];
  }
  private firearmGlyph(item: FirearmItem): string {
    if (item.kind === "pistol") return "▰🔫";
    if (item.kind === "magazine") return "▥";
    return "●";
  }
  private shortName(item: FirearmItem): string {
    if (item.kind === "pistol") return "MAKAROV";
    if (item.kind === "magazine") return `MAG ${item.rounds}/8`;
    return `AMMO ${item.rounds}`;
  }
  private baseGlyph(id: string): string {
    if (id === "knife") return "🔪";
    if (id === "cigarettes") return "▥";
    return "▰";
  }
  private button(
    label: string,
    action: () => void,
    disabled = false,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", action);
    return button;
  }
  private toast(message: string): void {
    const toast = document.createElement("div");
    toast.className = "inventory-toast";
    toast.textContent = message;
    document.querySelector("#app")?.append(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }
  private installFirearmStyles(): void {
    if (document.querySelector("#firearm-v9-styles")) return;
    const style = document.createElement("style");
    style.id = "firearm-v9-styles";
    style.textContent = `.firearm-item-panel .firearm-art{margin:12px auto;width:min(560px,76vw);height:210px;display:grid;place-items:center;border:3px solid #66746c;background:radial-gradient(circle,#38413d,#101514 72%);font-size:96px}.firearm-item-panel .firearm-art.magazine{font-size:130px}.firearm-item-panel .firearm-art.ammo{font-size:120px;color:#d5a94c}.firearm-item-panel .item-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.firearm-item-panel .item-actions button{min-width:150px;padding:13px 16px}.firearm-inventory .storage-cell span{font-size:9px}.firearm-inventory header p{letter-spacing:.08em}`;
    document.head.append(style);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => style.remove());
  }
}

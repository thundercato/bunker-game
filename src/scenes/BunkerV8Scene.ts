import Phaser from "phaser";
import { BunkerV6Scene as BaseBunkerV7Scene } from "./BunkerV7Scene";

const VERSION = "0.8.10";

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

type V8Runtime = {
  player: Phaser.Physics.Arcade.Sprite;
  uiOpen: boolean;
  knifeSharpness: number;
  knifeLocation: "storage" | "backpack" | "armed" | "world";
  backpack: Map<ItemId, InventoryItem>;
  currentKnifeItem: () => InventoryItem;
  stab: () => void;
  throwKnife: () => void;
};

export class BunkerV8Scene extends BaseBunkerV7Scene {
  private v8Overlay!: HTMLElement;
  private v8Controls!: HTMLElement;
  private workstationBackpackButton!: HTMLElement;
  private attackButton!: HTMLButtonElement;
  private throwButton!: HTMLButtonElement;
  private lastRubPoint: { x: number; y: number } | null = null;
  private rubDistance = 0;
  private readonly bladePolish = Array.from({ length: 12 }, () => 0);

  public override create(): void {
    super.create();
    this.v8Overlay = this.requireV8Element(".game-overlay");
    this.v8Controls = this.requireV8Element(".touch-controls");
    this.workstationBackpackButton = this.requireV8Element(".backpack-button");
    this.configureFeetCollision();
    this.configureStartScreen();
    this.configureDigitalHud();
    this.makeWeaponButtons();
    this.installV8Styles();

    window.addEventListener("bunker-message", this.captureWorkstation, true);
    window.addEventListener("bunker-touch-attack", this.attack);
    window.addEventListener("bunker-touch-throw", this.throwWeapon);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        "bunker-message",
        this.captureWorkstation,
        true,
      );
      window.removeEventListener("bunker-touch-attack", this.attack);
      window.removeEventListener("bunker-touch-throw", this.throwWeapon);
      this.attackButton.remove();
      this.throwButton.remove();
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.correctLivingRoomCamera();
  }

  private correctLivingRoomCamera(): void {
    const player = this.runtimeV8().player;
    if (player.x < 64 || player.x > 640 || player.y < 96 || player.y > 544)
      return;
    const camera = this.cameras.main;
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, 48, 0.18);
  }

  private runtimeV8(): V8Runtime {
    return this as unknown as V8Runtime;
  }

  private requireV8Element(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }

  private configureFeetCollision(): void {
    const body = this.runtimeV8().player.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 8).setOffset(7, 24);
  }

  private configureStartScreen(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
    for (const child of this.children.list) {
      if (!(child instanceof Phaser.GameObjects.Text)) continue;
      if (child.text.startsWith("BUNKER v")) child.setText("BUNKER GAME");
    }
  }

  private configureDigitalHud(): void {
    const hud = this.requireV8Element(".survival-hud");
    hud.classList.add("digital-segment-hud");
    for (const row of hud.querySelectorAll<HTMLElement>(".status-row")) {
      const track = row.querySelector<HTMLElement>("i");
      if (!track) continue;
      track.replaceChildren();
      for (let index = 0; index < 10; index += 1) {
        const segment = document.createElement("b");
        segment.className = "lcd-segment";
        segment.dataset.index = index.toString();
        track.append(segment);
      }
    }
    window.addEventListener("bunker-state", this.updateSegments);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener("bunker-state", this.updateSegments),
    );
  }

  private readonly updateSegments = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        health: number;
        hunger: number;
        thirst: number;
        stamina: number;
      }>
    ).detail;
    const values = [
      detail.health,
      detail.hunger,
      detail.thirst,
      detail.stamina,
    ];
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(".survival-hud .status-row"),
    );
    values.forEach((value, rowIndex) => {
      const track = rows[rowIndex]?.querySelector<HTMLElement>("i");
      if (!track) return;
      const segments = Array.from(
        track.querySelectorAll<HTMLElement>(".lcd-segment"),
      );
      segments.forEach((segment, index) => {
        const portion = Phaser.Math.Clamp(value / 10 - index, 0, 1);
        const level = Math.round(portion * 5);
        segment.dataset.level = level.toString();
      });
    });
  };

  private makeWeaponButtons(): void {
    const actions = this.requireV8Element(".touch-actions");
    this.attackButton = this.makeTouchButton("WEAPON", "touch-weapon");
    this.throwButton = this.makeTouchButton("THROW", "touch-throw");
    this.attackButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      window.dispatchEvent(new Event("bunker-touch-attack"));
    });
    this.throwButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      window.dispatchEvent(new Event("bunker-touch-throw"));
    });
    actions.append(this.attackButton, this.throwButton);
  }

  private makeTouchButton(label: string, className: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `touch-button ${className}`;
    button.textContent = label;
    return button;
  }

  private readonly attack = (): void => {
    const runtime = this.runtimeV8();
    if (!runtime.uiOpen && runtime.knifeLocation === "armed") runtime.stab();
  };

  private readonly throwWeapon = (): void => {
    const runtime = this.runtimeV8();
    if (!runtime.uiOpen && runtime.knifeLocation === "armed")
      runtime.throwKnife();
  };

  private readonly captureWorkstation = (event: Event): void => {
    const detail = (event as CustomEvent<{ title: string }>).detail;
    if (detail.title !== "WEAPON-CLEANING TABLE") return;
    event.stopImmediatePropagation();
    this.openWorkstation();
  };

  private setWorkstationOpen(open: boolean): void {
    this.runtimeV8().uiOpen = open;
    this.v8Controls.classList.toggle("is-hidden", open);
    this.workstationBackpackButton.classList.toggle("is-hidden", open);
    this.v8Overlay.classList.toggle("is-open", open);
    this.v8Overlay.classList.toggle("workstation-overlay", open);
    if (!open) this.v8Overlay.replaceChildren();
  }

  private closeWorkstation = (): void => this.setWorkstationOpen(false);

  private openWorkstation(): void {
    this.setWorkstationOpen(true);
    const panel = document.createElement("div");
    panel.className = "workstation-screen";
    panel.innerHTML = `
      <div class="workstation-art" aria-label="Rough underground weapon workstation">
        <div class="lamp"></div><div class="pegboard"></div>
        <div class="bench"><i></i><i></i><i></i><span></span></div>
        <div class="vice"></div><div class="rag"></div>
      </div>
      <button class="maintain-weapons">MAINTAIN WEAPONS</button>
      <button class="workstation-back">BACK</button>`;
    panel
      .querySelector(".maintain-weapons")
      ?.addEventListener("click", () => this.openWeaponList());
    panel
      .querySelector(".workstation-back")
      ?.addEventListener("click", this.closeWorkstation);
    this.v8Overlay.replaceChildren(panel);
  }

  private openWeaponList(): void {
    const runtime = this.runtimeV8();
    const hasKnife =
      runtime.backpack.has("knife") || runtime.knifeLocation === "armed";
    const panel = document.createElement("div");
    panel.className = "workstation-screen weapon-list-screen";
    panel.innerHTML = `<h2>WEAPONS HELD</h2><div class="weapon-list"></div><button class="workstation-back">BACK</button>`;
    const list = panel.querySelector<HTMLElement>(".weapon-list");
    if (!list) throw new Error("Weapon list missing");
    if (hasKnife) {
      const knife = document.createElement("button");
      knife.className = "weapon-card";
      knife.innerHTML = `<span class="knife-silhouette">🔪</span><strong>UTILITY KNIFE</strong><small>SHARPNESS ${Math.round(runtime.knifeSharpness)}%</small>`;
      knife.addEventListener("click", () => this.openKnifeMaintenance());
      list.append(knife);
    } else {
      list.innerHTML = `<p class="empty-weapons">NO WEAPONS IN BACKPACK OR ARMED.</p>`;
    }
    panel
      .querySelector(".workstation-back")
      ?.addEventListener("click", () => this.openWorkstation());
    this.v8Overlay.replaceChildren(panel);
  }

  private openKnifeMaintenance(): void {
    const runtime = this.runtimeV8();
    this.rubDistance = 0;
    const panel = document.createElement("div");
    panel.className = "workstation-screen knife-maintenance";
    panel.innerHTML = `
      <h2>SHARPEN BLADE</h2>
      <p>Rub repeatedly along the blade with your finger.</p>
      <div class="sharpen-zone"><div class="large-knife"><i></i><b><span class="rust-segments">${this.bladePolish.map((_, index) => `<em data-rust="${index}"></em>`).join("")}</span></b></div><div class="stone"></div><div class="spark-layer"></div></div>
      <div class="sharpness-readout"><span>SHARPNESS</span><strong>${Math.round(runtime.knifeSharpness)}%</strong><div><i></i></div></div>
      <button class="workstation-back">BACK</button>`;
    const zone = panel.querySelector<HTMLElement>(".sharpen-zone");
    if (!zone) throw new Error("Sharpen zone missing");
    zone.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      zone.setPointerCapture(event.pointerId);
      this.lastRubPoint = { x: event.clientX, y: event.clientY };
    });
    zone.addEventListener("pointermove", (event) => {
      if (!zone.hasPointerCapture(event.pointerId) || !this.lastRubPoint)
        return;
      const distance = Math.hypot(
        event.clientX - this.lastRubPoint.x,
        event.clientY - this.lastRubPoint.y,
      );
      this.lastRubPoint = { x: event.clientX, y: event.clientY };
      if (distance < 2) return;
      const blade = panel.querySelector<HTMLElement>(".large-knife b");
      if (!blade) return;
      const bladeRect = blade.getBoundingClientRect();
      if (
        event.clientX < bladeRect.left ||
        event.clientX > bladeRect.right ||
        event.clientY < bladeRect.top ||
        event.clientY > bladeRect.bottom
      )
        return;
      const normalisedX = Phaser.Math.Clamp(
        (event.clientX - bladeRect.left) / bladeRect.width,
        0,
        0.999,
      );
      const segmentIndex = Math.floor(normalisedX * this.bladePolish.length);
      const currentPolish = this.bladePolish[segmentIndex] ?? 1;
      if (currentPolish >= 1) return;

      this.rubDistance += distance;
      this.bladePolish[segmentIndex] = Phaser.Math.Clamp(
        currentPolish + distance / 1275,
        0,
        1,
      );
      const averagePolish =
        this.bladePolish.reduce((total, polish) => total + polish, 0) /
        this.bladePolish.length;
      runtime.knifeSharpness = 15 + averagePolish * 85;
      this.makeSparks(panel, event.clientX, event.clientY);
      this.refreshSharpness(panel);
    });
    const release = (): void => {
      this.lastRubPoint = null;
    };
    zone.addEventListener("pointerup", release);
    zone.addEventListener("pointercancel", release);
    panel
      .querySelector(".workstation-back")
      ?.addEventListener("click", () => this.openWeaponList());
    this.v8Overlay.replaceChildren(panel);
    this.refreshSharpness(panel);
  }

  private makeSparks(
    panel: HTMLElement,
    clientX: number,
    clientY: number,
  ): void {
    const layer = panel.querySelector<HTMLElement>(".spark-layer");
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    for (let index = 0; index < 4; index += 1) {
      const spark = document.createElement("i");
      spark.className = "sharpen-spark";
      spark.style.left = `${clientX - rect.left}px`;
      spark.style.top = `${clientY - rect.top}px`;
      spark.style.setProperty("--spark-x", `${(Math.random() - 0.5) * 70}px`);
      spark.style.setProperty("--spark-y", `${-20 - Math.random() * 55}px`);
      layer.append(spark);
      window.setTimeout(() => spark.remove(), 420);
    }
  }

  private refreshSharpness(panel: HTMLElement): void {
    const value = Phaser.Math.Clamp(this.runtimeV8().knifeSharpness, 0, 100);
    const number = panel.querySelector<HTMLElement>(
      ".sharpness-readout strong",
    );
    const fill = panel.querySelector<HTMLElement>(".sharpness-readout div i");
    if (number) number.textContent = `${Math.round(value)}%`;
    panel
      .querySelectorAll<HTMLElement>("[data-rust]")
      .forEach((segment, index) => {
        segment.style.opacity = (1 - (this.bladePolish[index] ?? 0)).toString();
      });
    if (fill) {
      fill.style.width = `${value}%`;
      fill.style.setProperty("--sharpness", value.toString());
    }
  }

  private installV8Styles(): void {
    const style = document.createElement("style");
    style.textContent = `
      .touch-weapon,.touch-throw{position:absolute;width:76px;height:54px;font-size:12px;border-radius:16px}
      .touch-weapon{right:112px;bottom:205px}.touch-throw{right:28px;bottom:205px}
      .digital-segment-hud .status-row i{display:grid!important;grid-template-columns:repeat(10,1fr);gap:3px;background:#07100d!important;padding:3px;height:14px}
      .digital-segment-hud .status-row i>*.lcd-segment{display:block!important;width:auto!important;height:100%;background:currentColor;opacity:.06;box-shadow:none}
      .digital-segment-hud .status-row:nth-of-type(2){color:#ff5349}.digital-segment-hud .status-row:nth-of-type(3){color:#ffd34e}.digital-segment-hud .status-row:nth-of-type(4){color:#4cbcff}.digital-segment-hud .status-row:nth-of-type(5){color:#74f08d}
      .lcd-segment[data-level='1']{opacity:.18!important}.lcd-segment[data-level='2']{opacity:.34!important}.lcd-segment[data-level='3']{opacity:.52!important}.lcd-segment[data-level='4']{opacity:.74!important}.lcd-segment[data-level='5']{opacity:1!important;box-shadow:0 0 7px currentColor!important}
      .workstation-overlay{background:transparent!important;backdrop-filter:none!important;align-items:stretch!important;justify-content:stretch!important;pointer-events:auto}
      .workstation-screen{position:absolute;inset:0;color:#d8e1d6;font-family:monospace;text-align:center;pointer-events:none}
      .workstation-screen button{pointer-events:auto}
      .workstation-art{position:absolute;left:17%;right:17%;top:8%;bottom:19%;overflow:hidden;background:linear-gradient(#273033 0 54%,#201711 54%);border:5px solid #101719;box-shadow:0 18px 45px #000c}
      .workstation-art .pegboard{position:absolute;inset:8% 8% 45%;background:radial-gradient(circle,#101719 2px,transparent 3px) 0 0/22px 22px,#51584f;border:8px solid #30362f}
      .workstation-art .lamp{position:absolute;z-index:3;left:42%;top:-4%;width:16%;height:19%;background:#363c36;border-radius:0 0 50% 50%;box-shadow:0 80px 80px #ffd77b66}
      .workstation-art .bench{position:absolute;left:5%;right:5%;bottom:9%;height:34%;background:linear-gradient(#6a4b31 0 15%,#332317 15%);border:5px solid #17100c}
      .workstation-art .bench i{position:relative;display:inline-block;width:8%;height:32%;margin:8% 4%;background:#8d8170;border-radius:40% 40% 10% 10%;transform:rotate(12deg)}
      .workstation-art .bench span{display:inline-block;width:20%;height:14%;background:#15191a;border:4px solid #69716b}
      .workstation-art .vice{position:absolute;left:18%;bottom:25%;width:14%;height:13%;background:#294753;border:6px solid #101719}
      .workstation-art .rag{position:absolute;right:17%;bottom:26%;width:18%;height:12%;background:#7d735e;transform:skew(-18deg)}
      .maintain-weapons{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);padding:16px 28px}
      .workstation-back{position:absolute;right:3%;bottom:4%;padding:14px 24px}
      .weapon-list-screen h2,.knife-maintenance h2{margin-top:5%;font-size:28px;text-shadow:0 0 8px #7cf0a0}
      .weapon-list{display:flex;justify-content:center;margin-top:8%}.weapon-card{width:260px;height:260px;background:#141c1b;border:3px solid #607a69;color:#e8efe9}.knife-silhouette{display:block;font-size:100px}.weapon-card strong,.weapon-card small{display:block;margin-top:12px}
      .empty-weapons{margin-top:15%;padding:20px;background:#080d0ccc}
      .knife-maintenance>p{font-size:16px}.sharpen-zone{position:absolute;left:18%;right:18%;top:20%;bottom:27%;pointer-events:auto;touch-action:none;background:radial-gradient(ellipse,#3d3328,#13100e 70%);border:4px solid #46534d}
      .large-knife{position:absolute;left:17%;right:13%;top:38%;height:22%;transform:rotate(-8deg)}.large-knife i{position:absolute;left:0;width:28%;height:100%;background:#2d2118;border:5px solid #100c09;border-radius:15px}.large-knife b{position:absolute;left:25%;right:0;top:10%;height:80%;clip-path:polygon(0 0,100% 50%,0 100%);background:linear-gradient(#edf4f1,#6f7d7b 53%,#d5ddda);overflow:hidden}.rust-segments{position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,1fr)}.rust-segments em{display:block;background:linear-gradient(90deg,#5a2d12,#9a5425 45%,#4a2410);border-right:1px solid #2b1308;opacity:1}.spark-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}.sharpen-spark{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff3a0;box-shadow:0 0 8px #ff9b22;animation:spark-flight .42s ease-out forwards}@keyframes spark-flight{to{transform:translate(var(--spark-x),var(--spark-y)) scale(.2);opacity:0}}
      .stone{position:absolute;left:34%;right:20%;bottom:14%;height:12%;background:#665c4d;border:4px solid #2c2822;transform:rotate(-8deg)}
      .sharpness-readout{position:absolute;left:25%;right:25%;bottom:15%;display:grid;grid-template-columns:auto 80px;gap:8px;text-align:left}.sharpness-readout div{grid-column:1/3;height:22px;background:#24100d;border:3px solid #68716b}.sharpness-readout div i{display:block;height:100%;width:0;background:hsl(calc(var(--sharpness)*1.2),85%,48%);box-shadow:0 0 10px currentColor}
    `;
    document.head.append(style);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => style.remove());
  }
}

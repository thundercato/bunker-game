import Phaser from "phaser";
import { BunkerV9Scene } from "./BunkerV9Scene";

const VERSION = "0.1.0.3";
const SEGMENT_COUNT = 16;

type CleaningTool = "oil" | "brush" | "rod" | "paper";

type BaseItem = {
  id: string;
  name: string;
  description: string;
  details: string;
  stats: string[];
  slot: number;
  taken: boolean;
};

type FirearmItem = {
  id: string;
  name: string;
  kind: "pistol" | "magazine" | "ammo";
  slot: number;
  location: "storage" | "backpack" | "gun";
  rounds: number;
};

type V10Runtime = {
  uiOpen: boolean;
  knifeLocation: "storage" | "backpack" | "armed" | "world";
  knifeSharpness: number;
  backpack: Map<string, BaseItem>;
  firearmItems: Map<string, FirearmItem>;
  openKnifeMaintenance: () => void;
};

export class BunkerV10Scene extends BunkerV9Scene {
  private v10Overlay!: HTMLElement;
  private v10Controls!: HTMLElement;
  private v10BackpackButton!: HTMLElement;
  private selectedTool: CleaningTool = "oil";
  private oilApplied = false;
  private lastCleanPoint: { x: number; y: number } | null = null;
  private readonly gunCleanliness = Array.from(
    { length: SEGMENT_COUNT },
    () => 0.2,
  );

  public override create(): void {
    window.addEventListener("bunker-message", this.captureV10Workstation, true);
    super.create();
    this.v10Overlay = this.requireV10Element(".game-overlay");
    this.v10Controls = this.requireV10Element(".touch-controls");
    this.v10BackpackButton = this.requireV10Element(".backpack-button");
    this.updateV10Version();
    this.installV10Styles();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        "bunker-message",
        this.captureV10Workstation,
        true,
      );
    });
  }

  private runtimeV10(): V10Runtime {
    return this as unknown as V10Runtime;
  }

  private requireV10Element(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }

  private updateV10Version(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  private readonly captureV10Workstation = (event: Event): void => {
    const detail = (event as CustomEvent<{ title: string }>).detail;
    if (detail.title !== "WEAPON-CLEANING TABLE") return;
    event.stopImmediatePropagation();
    this.openV10Workstation();
  };

  private setV10UiOpen(open: boolean): void {
    this.runtimeV10().uiOpen = open;
    this.v10Controls.classList.toggle("is-hidden", open);
    this.v10BackpackButton.classList.toggle("is-hidden", open);
    this.v10Overlay.classList.toggle("is-open", open);
    this.v10Overlay.classList.toggle("workstation-overlay", open);
    if (!open) this.v10Overlay.replaceChildren();
  }

  private closeV10Workstation = (): void => this.setV10UiOpen(false);

  private openV10Workstation(): void {
    this.setV10UiOpen(true);
    const panel = document.createElement("div");
    panel.className = "workstation-screen v10-workstation";
    panel.innerHTML = `
      <div class="workstation-art" aria-label="Underground weapon workstation">
        <div class="lamp"></div><div class="pegboard"></div>
        <div class="bench"><i></i><i></i><i></i><span></span></div>
        <div class="vice"></div><div class="rag"></div>
        <div class="cleaning-kit"><b>OIL</b><b>BRUSH</b><b>ROD</b><b>PAPER</b></div>
      </div>
      <button class="maintain-weapons">MAINTAIN WEAPONS</button>
      <button class="workstation-back">BACK</button>`;
    panel
      .querySelector(".maintain-weapons")
      ?.addEventListener("click", () => this.openV10WeaponList());
    panel
      .querySelector(".workstation-back")
      ?.addEventListener("click", this.closeV10Workstation);
    this.v10Overlay.replaceChildren(panel);
  }

  private openV10WeaponList(): void {
    const runtime = this.runtimeV10();
    const hasKnife =
      runtime.backpack.has("knife") || runtime.knifeLocation === "armed";
    const pistol = runtime.firearmItems.get("makarov");
    const hasPistol =
      pistol?.location === "backpack" || pistol?.location === "gun";

    const panel = document.createElement("div");
    panel.className = "workstation-screen weapon-list-screen";
    panel.innerHTML = `<h2>WEAPONS HELD</h2><div class="weapon-list"></div><button class="workstation-back">BACK</button>`;
    const list = panel.querySelector<HTMLElement>(".weapon-list");
    if (!list) throw new Error("Weapon list missing");

    if (hasKnife) {
      const knife = document.createElement("button");
      knife.className = "weapon-card";
      knife.innerHTML = `<span class="knife-silhouette">🔪</span><strong>UTILITY KNIFE</strong><small>SHARPNESS ${Math.round(runtime.knifeSharpness)}%</small>`;
      knife.addEventListener("click", () => runtime.openKnifeMaintenance());
      list.append(knife);
    }

    if (hasPistol) {
      const pistolButton = document.createElement("button");
      pistolButton.className = "weapon-card makarov-card";
      pistolButton.innerHTML = `<span class="makarov-silhouette">▰</span><strong>MAKAROV PM</strong><small>CONDITION ${Math.round(this.condition())}%</small>`;
      pistolButton.addEventListener("click", () => this.openMakarovMaintenance());
      list.append(pistolButton);
    }

    if (!hasKnife && !hasPistol) {
      list.innerHTML = `<p class="empty-weapons">NO WEAPONS IN BACKPACK OR ARMED.</p>`;
    }

    panel
      .querySelector(".workstation-back")
      ?.addEventListener("click", () => this.openV10Workstation());
    this.v10Overlay.replaceChildren(panel);
  }

  private openMakarovMaintenance(): void {
    this.lastCleanPoint = null;
    const panel = document.createElement("div");
    panel.className = "workstation-screen makarov-maintenance";
    panel.innerHTML = `
      <h2>CLEAN MAKAROV PM</h2>
      <p class="cleaning-instruction">Select the oil can, then rub the brown areas with the tools.</p>
      <div class="gun-clean-zone">
        <div class="large-makarov">
          <div class="gun-slide"><span class="gun-dirt">${this.gunCleanliness
            .map((_, index) => `<i data-gun-segment="${index}"></i>`)
            .join("")}</span></div>
          <div class="gun-frame"></div><div class="gun-grip"></div>
        </div>
        <div class="cleaning-sparks"></div>
      </div>
      <div class="cleaning-tools">
        <button data-tool="oil">OIL CAN</button>
        <button data-tool="brush">BRUSH</button>
        <button data-tool="rod">ROD</button>
        <button data-tool="paper">PAPER</button>
      </div>
      <div class="condition-readout"><span>CONDITION</span><strong>${Math.round(
        this.condition(),
      )}%</strong><div><i></i></div></div>
      <button class="workstation-back">BACK</button>`;

    for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-tool]")) {
      button.addEventListener("click", () => {
        const tool = button.dataset.tool as CleaningTool;
        this.selectedTool = tool;
        if (tool === "oil") {
          this.oilApplied = true;
          this.showCleaningMessage(panel, "Oil applied. Work it into the brown areas.");
        } else if (!this.oilApplied) {
          this.showCleaningMessage(panel, "Apply oil before scrubbing the mechanism.");
        } else {
          this.showCleaningMessage(panel, `${button.textContent ?? tool} selected. Rub the dirty metal.`);
        }
        this.refreshToolButtons(panel);
      });
    }

    const zone = panel.querySelector<HTMLElement>(".gun-clean-zone");
    const slide = panel.querySelector<HTMLElement>(".gun-slide");
    if (!zone || !slide) throw new Error("Makarov cleaning zone missing");

    zone.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      zone.setPointerCapture(event.pointerId);
      this.lastCleanPoint = { x: event.clientX, y: event.clientY };
    });
    zone.addEventListener("pointermove", (event) => {
      if (!zone.hasPointerCapture(event.pointerId) || !this.lastCleanPoint)
        return;
      const distance = Math.hypot(
        event.clientX - this.lastCleanPoint.x,
        event.clientY - this.lastCleanPoint.y,
      );
      this.lastCleanPoint = { x: event.clientX, y: event.clientY };
      if (distance < 2 || this.selectedTool === "oil" || !this.oilApplied)
        return;

      const rect = slide.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        return;

      const normalised = Phaser.Math.Clamp(
        (event.clientX - rect.left) / rect.width,
        0,
        0.999,
      );
      const index = Math.floor(normalised * SEGMENT_COUNT);
      const current = this.gunCleanliness[index] ?? 1;
      if (current >= 1) return;

      const efficiency =
        this.selectedTool === "brush"
          ? 1
          : this.selectedTool === "rod"
            ? 0.78
            : 0.58;
      this.gunCleanliness[index] = Phaser.Math.Clamp(
        current + (distance * efficiency) / 950,
        0,
        1,
      );
      this.makeCleaningParticles(panel, event.clientX, event.clientY);
      this.refreshMakarov(panel);
    });

    const release = (): void => {
      this.lastCleanPoint = null;
    };
    zone.addEventListener("pointerup", release);
    zone.addEventListener("pointercancel", release);
    panel
      .querySelector(".workstation-back")
      ?.addEventListener("click", () => this.openV10WeaponList());
    this.v10Overlay.replaceChildren(panel);
    this.refreshToolButtons(panel);
    this.refreshMakarov(panel);
  }

  private condition(): number {
    const average =
      this.gunCleanliness.reduce((total, value) => total + value, 0) /
      SEGMENT_COUNT;
    return average * 100;
  }

  private refreshToolButtons(panel: HTMLElement): void {
    for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-tool]")) {
      button.classList.toggle("is-selected", button.dataset.tool === this.selectedTool);
    }
  }

  private refreshMakarov(panel: HTMLElement): void {
    panel
      .querySelectorAll<HTMLElement>("[data-gun-segment]")
      .forEach((segment, index) => {
        segment.style.opacity = (1 - (this.gunCleanliness[index] ?? 0)).toString();
      });
    const condition = this.condition();
    const number = panel.querySelector<HTMLElement>(".condition-readout strong");
    const fill = panel.querySelector<HTMLElement>(".condition-readout div i");
    if (number) number.textContent = `${Math.round(condition)}%`;
    if (fill) fill.style.width = `${condition}%`;
  }

  private showCleaningMessage(panel: HTMLElement, message: string): void {
    const instruction = panel.querySelector<HTMLElement>(".cleaning-instruction");
    if (instruction) instruction.textContent = message;
  }

  private makeCleaningParticles(
    panel: HTMLElement,
    clientX: number,
    clientY: number,
  ): void {
    const layer = panel.querySelector<HTMLElement>(".cleaning-sparks");
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    for (let index = 0; index < 3; index += 1) {
      const particle = document.createElement("i");
      particle.className = "cleaning-particle";
      particle.style.left = `${clientX - rect.left}px`;
      particle.style.top = `${clientY - rect.top}px`;
      particle.style.setProperty(
        "--clean-x",
        `${(Math.random() - 0.5) * 54}px`,
      );
      particle.style.setProperty("--clean-y", `${-10 - Math.random() * 35}px`);
      layer.append(particle);
      window.setTimeout(() => particle.remove(), 380);
    }
  }

  private installV10Styles(): void {
    if (document.querySelector("#bunker-v10-styles")) return;
    const style = document.createElement("style");
    style.id = "bunker-v10-styles";
    style.textContent = `
      .cleaning-kit{position:absolute;left:36%;right:12%;bottom:27%;display:flex;gap:8px;justify-content:center}.cleaning-kit b{padding:5px;background:#19201d;border:2px solid #747e72;color:#d0bc77;font:700 9px monospace}
      .makarov-card .makarov-silhouette{font-size:68px;color:#555f5d;transform:rotate(-8deg)}
      .makarov-maintenance h2{margin-top:3%;font-size:28px;text-shadow:0 0 8px #7cf0a0}.cleaning-instruction{margin:6px auto 0;max-width:720px;color:#d6caa2}
      .gun-clean-zone{position:absolute;left:11%;right:11%;top:18%;height:48%;background:radial-gradient(circle at 50% 45%,#39423d,#111715 70%);border:4px solid #626d64;pointer-events:auto;touch-action:none;overflow:hidden}
      .large-makarov{position:absolute;left:12%;right:12%;top:23%;height:54%}.gun-slide{position:absolute;left:7%;right:10%;top:0;height:36%;clip-path:polygon(0 8%,88% 0,100% 38%,96% 88%,12% 100%,0 75%);background:linear-gradient(#c9cfcb,#697370 48%,#dfe4df 54%,#58615f);border:3px solid #202625;overflow:hidden}.gun-frame{position:absolute;left:20%;right:16%;top:31%;height:19%;background:#707a75;clip-path:polygon(0 0,100% 0,86% 100%,18% 88%)}.gun-grip{position:absolute;right:20%;top:42%;width:24%;height:58%;background:repeating-linear-gradient(45deg,#251c16 0 5px,#443125 5px 10px);clip-path:polygon(12% 0,100% 0,84% 100%,0 89%);border:3px solid #17110e}
      .gun-dirt{position:absolute;inset:0;display:grid;grid-template-columns:repeat(16,1fr)}.gun-dirt i{display:block;background:linear-gradient(90deg,#4a240d,#8c4a1c 45%,#38200f);border-right:1px solid #291207;opacity:.8;mix-blend-mode:multiply}
      .cleaning-tools{position:absolute;left:13%;right:13%;bottom:17%;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.cleaning-tools button{padding:13px 6px;background:#16201b;border:2px solid #758276;color:#d8e1d6;font:800 12px monospace}.cleaning-tools button.is-selected{border-color:#d9bf5a;color:#fff1a2;box-shadow:0 0 12px #d9bf5a88 inset,0 0 10px #d9bf5a55}
      .condition-readout{position:absolute;left:19%;right:19%;bottom:8%;display:grid;grid-template-columns:auto 64px 1fr;gap:12px;align-items:center;font:800 14px monospace}.condition-readout>div{height:17px;background:#190d08;border:2px solid #6b5d45}.condition-readout>div i{display:block;height:100%;background:linear-gradient(90deg,#a73b21,#d9a52f 55%,#66d685);box-shadow:0 0 9px #66d68599}
      .cleaning-sparks{position:absolute;inset:0;pointer-events:none}.cleaning-particle{position:absolute;width:5px;height:5px;border-radius:50%;background:#d8c079;box-shadow:0 0 6px #e4b23f;animation:cleaning-flight .38s ease-out forwards}@keyframes cleaning-flight{to{transform:translate(var(--clean-x),var(--clean-y)) scale(.2);opacity:0}}
      @media(max-width:700px){.gun-clean-zone{left:4%;right:4%;top:17%;height:45%}.large-makarov{left:4%;right:4%;top:25%}.cleaning-tools{left:5%;right:5%;bottom:20%;gap:5px}.cleaning-tools button{font-size:10px;padding:11px 3px}.condition-readout{left:7%;right:7%;bottom:11%}}
    `;
    document.head.append(style);
  }
}

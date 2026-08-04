import { UpdateManager } from "@/pwa/UpdateManager";
import { GAME_VERSION } from "@/version";
import { BunkerV17Scene } from "./BunkerV17Scene";

export class BunkerV18Scene extends BunkerV17Scene {
  private readonly updates = new UpdateManager();

  public override create(): void {
    super.create();
    this.installReleaseStyles();
    this.applyVersionUi();
    void this.updates.start().catch(() => undefined);
    this.events.once("shutdown", () => this.updates.destroy());
  }

  private applyVersionUi(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${GAME_VERSION}`;

    const app = document.querySelector<HTMLElement>("#app");
    if (!app) return;
    let footer = app.querySelector<HTMLElement>(".title-version-footer");
    if (!footer) {
      footer = document.createElement("small");
      footer.className = "title-version-footer";
      app.append(footer);
    }
    footer.textContent = `v${GAME_VERSION}`;
  }

  private installReleaseStyles(): void {
    if (document.querySelector("#bunker-v18-styles")) return;
    const style = document.createElement("style");
    style.id = "bunker-v18-styles";
    style.textContent = `
      .title-version-footer{position:absolute;right:max(8px,env(safe-area-inset-right));bottom:max(6px,env(safe-area-inset-bottom));z-index:31;color:#8a9b91;font:700 9px/1 monospace;letter-spacing:.08em;pointer-events:none}
      .update-notice{position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));z-index:9999;display:flex;gap:12px;align-items:center;transform:translateX(-50%);padding:9px 12px;border:1px solid #7bea90;border-radius:6px;background:#07120ddd;color:#dfffe4;font:700 12px/1 monospace}
      .update-notice button{padding:7px 10px;border:1px solid #7bea90;border-radius:4px;background:#244a2d;color:#eaffed;font:800 11px/1 monospace}
    `;
    document.head.append(style);
  }
}

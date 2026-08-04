import { BunkerV17Scene } from "./BunkerV17Scene";
import { GAME_VERSION } from "@/version";
import { UpdateManager } from "@/pwa/UpdateManager";

export class BunkerV18Scene extends BunkerV17Scene {
  private readonly updates = new UpdateManager();

  public override create(): void {
    super.create();
    this.applyVersionUi();
    void this.updates.start();
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
}

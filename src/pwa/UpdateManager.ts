import { GAME_VERSION } from "@/version";

const VERSION_URL = "./version.json";

export class UpdateManager {
  private registration?: ServiceWorkerRegistration;
  private notification?: HTMLDivElement;
  private reloading = false;

  public async start(): Promise<void> {
    if (!("serviceWorker" in navigator)) return;
    this.registration = await navigator.serviceWorker.register("./sw.js", {
      scope: "./",
      updateViaCache: "none",
    });
    await this.check();
    window.addEventListener("focus", this.triggerCheck);
    document.addEventListener("visibilitychange", this.onVisibility);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (this.reloading) window.location.reload();
    });
  }

  public destroy(): void {
    window.removeEventListener("focus", this.triggerCheck);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.notification?.remove();
  }

  private readonly triggerCheck = (): void => {
    void this.check();
  };

  private readonly onVisibility = (): void => {
    if (!document.hidden) this.triggerCheck();
  };

  private async check(): Promise<void> {
    await this.registration?.update();
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const deployed = (await response.json()) as { version?: string };
    if (deployed.version && deployed.version !== GAME_VERSION) {
      this.showUpdate(deployed.version);
    }
  }

  private showUpdate(version: string): void {
    if (this.notification) return;
    const notice = document.createElement("div");
    notice.className = "update-notice";
    notice.innerHTML = `<span>New version available. v${version}</span><button>RELOAD</button>`;
    notice.querySelector("button")?.addEventListener("click", () => {
      this.reloading = true;
      this.registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    });
    document.body.append(notice);
    this.notification = notice;
  }
}

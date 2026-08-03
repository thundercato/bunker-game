import Phaser from "phaser";
import { BunkerV13Scene } from "./BunkerV13Scene";

const VERSION = "0.1.0.8";
const LIVING_ROOM = new Phaser.Geom.Rectangle(32, 64, 640, 512);
const TRAINING_ROOM = new Phaser.Geom.Rectangle(1184, 64, 704, 544);

export class BunkerV14Scene extends BunkerV13Scene {
  private hapticSwitch?: HTMLInputElement;
  private framedRoomActive = false;

  public override create(): void {
    super.create();
    this.updateVersionLabelsV14();
    this.installIosHapticBridge();
    this.pinTouchControls();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hapticSwitch?.remove();
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.updateRoomCamera();
  }

  private updateVersionLabelsV14(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  private findPlayerSpriteV14(): Phaser.Physics.Arcade.Sprite | undefined {
    return this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite &&
        child.texture.key.startsWith("survivor-"),
    );
  }

  private updateRoomCamera(): void {
    const player = this.findPlayerSpriteV14();
    if (!player) return;

    const room = [LIVING_ROOM, TRAINING_ROOM].find((candidate) =>
      candidate.contains(player.x, player.y),
    );
    const camera = this.cameras.main;

    if (!room) {
      if (this.framedRoomActive) {
        camera.setZoom(1.4);
        camera.startFollow(player, true, 0.08, 0.08);
        this.framedRoomActive = false;
      }
      return;
    }

    this.framedRoomActive = true;
    camera.stopFollow();

    // Fit the complete room vertically. Widescreen devices show additional
    // world at the sides rather than losing the room's ceiling or floor.
    const zoom = camera.height / room.height;
    camera.setZoom(zoom);
    camera.setScroll(
      room.centerX - camera.width / (2 * zoom),
      room.y,
    );
  }

  private pinTouchControls(): void {
    const style = document.createElement("style");
    style.id = "v14-touch-control-fix";
    style.textContent = `
      .touch-actions{
        position:absolute!important;
        top:auto!important;
        right:max(18px,env(safe-area-inset-right))!important;
        bottom:max(18px,env(safe-area-inset-bottom))!important;
        left:auto!important;
      }
      .touch-weapon{right:96px!important;bottom:92px!important}
      .touch-throw{right:0!important;bottom:92px!important}
    `;
    document.querySelector("#v14-touch-control-fix")?.remove();
    document.head.append(style);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => style.remove());
  }

  private installIosHapticBridge(): void {
    const weaponButton =
      document.querySelector<HTMLButtonElement>(".touch-weapon");
    if (!weaponButton) return;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.className = "ios-fire-haptic-switch";
    input.setAttribute("aria-label", "Fire weapon");
    input.addEventListener("change", () => {
      window.dispatchEvent(new Event("bunker-touch-attack"));
    });
    document.querySelector("#app")?.append(input);
    this.hapticSwitch = input;

    const syncPosition = (): void => {
      const buttonRect = weaponButton.getBoundingClientRect();
      input.style.left = `${buttonRect.left}px`;
      input.style.top = `${buttonRect.top}px`;
      input.style.width = `${buttonRect.width}px`;
      input.style.height = `${buttonRect.height}px`;
      input.style.display = weaponButton.offsetParent ? "block" : "none";
    };
    syncPosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("orientationchange", syncPosition);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("orientationchange", syncPosition);
    });

    const style = document.createElement("style");
    style.textContent = `
      .ios-fire-haptic-switch{
        position:fixed;z-index:30;margin:0;opacity:.001;appearance:auto;
        -webkit-appearance:auto;cursor:pointer;touch-action:manipulation;
      }
    `;
    document.head.append(style);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => style.remove());
  }
}

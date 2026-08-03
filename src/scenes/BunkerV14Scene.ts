import Phaser from "phaser";
import { BunkerV13Scene } from "./BunkerV13Scene";

const VERSION = "0.1.0.7";
const LIVING_ROOM = new Phaser.Geom.Rectangle(32, 64, 640, 544);
const TRAINING_ROOM = new Phaser.Geom.Rectangle(1184, 64, 704, 544);

export class BunkerV14Scene extends BunkerV13Scene {
  private hapticSwitch?: HTMLInputElement;

  public override create(): void {
    super.create();
    this.updateVersionLabelsV14();
    this.installIosHapticBridge();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hapticSwitch?.remove();
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.frameRoomWithTrueBounds();
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

  private frameRoomWithTrueBounds(): void {
    const player = this.findPlayerSpriteV14();
    if (!player) return;
    const room = [LIVING_ROOM, TRAINING_ROOM].find((candidate) =>
      candidate.contains(player.x, player.y),
    );
    if (!room) return;

    const camera = this.cameras.main;
    const zoom = Math.min(
      camera.width / room.width,
      camera.height / room.height,
    );
    camera.stopFollow();
    camera.setZoom(zoom);
    camera.setScroll(
      room.centerX - camera.width / (2 * zoom),
      room.centerY - camera.height / (2 * zoom),
    );
  }

  private installIosHapticBridge(): void {
    const weaponButton =
      document.querySelector<HTMLButtonElement>(".touch-weapon");
    const actions = weaponButton?.parentElement;
    if (!weaponButton || !actions) return;

    actions.style.position = "relative";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.className = "ios-fire-haptic-switch";
    input.setAttribute("aria-label", "Fire weapon");
    input.addEventListener("change", () => {
      window.dispatchEvent(new Event("bunker-touch-attack"));
    });
    actions.append(input);
    this.hapticSwitch = input;

    const syncPosition = (): void => {
      const buttonRect = weaponButton.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      input.style.left = `${buttonRect.left - actionsRect.left}px`;
      input.style.top = `${buttonRect.top - actionsRect.top}px`;
      input.style.width = `${buttonRect.width}px`;
      input.style.height = `${buttonRect.height}px`;
    };
    syncPosition();
    window.addEventListener("resize", syncPosition);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener("resize", syncPosition),
    );

    const style = document.createElement("style");
    style.textContent = `
      .ios-fire-haptic-switch{
        position:absolute;z-index:30;margin:0;opacity:.001;appearance:auto;
        -webkit-appearance:auto;cursor:pointer;touch-action:manipulation;
      }
    `;
    document.head.append(style);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => style.remove());
  }
}

import Phaser from "phaser";
import { BunkerV12Scene } from "./BunkerV12Scene";

const VERSION = "0.1.0.6";
const LIVING_ROOM = new Phaser.Geom.Rectangle(64, 96, 576, 448);
const TRAINING_ROOM = new Phaser.Geom.Rectangle(1216, 96, 640, 480);

export class BunkerV13Scene extends BunkerV12Scene {
  public override create(): void {
    super.create();
    this.updateVersionLabelsV13();
    window.addEventListener("bunker-gunshot", this.showMuzzleFlash);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("bunker-gunshot", this.showMuzzleFlash);
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.frameCurrentRoomExactly();
  }

  private updateVersionLabelsV13(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  private playerSprite(): Phaser.Physics.Arcade.Sprite | undefined {
    return this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite &&
        child.texture.key.startsWith("survivor-"),
    );
  }

  private frameCurrentRoomExactly(): void {
    const player = this.playerSprite();
    if (!player) return;
    const room = [LIVING_ROOM, TRAINING_ROOM].find((candidate) =>
      candidate.contains(player.x, player.y),
    );
    if (!room) return;

    const camera = this.cameras.main;
    const zoom = camera.height / room.height;
    camera.stopFollow();
    camera.setZoom(zoom);
    camera.setScroll(room.centerX - camera.width / (2 * zoom), room.y);
  }

  private readonly showMuzzleFlash = (): void => {
    const player = this.playerSprite();
    if (!player) return;

    const texture = player.texture.key;
    const direction = texture.includes("left")
      ? "left"
      : texture.includes("up")
        ? "up"
        : texture.includes("down")
          ? "down"
          : "right";

    const offsets = {
      left: { x: -22, y: -3, width: 28, height: 14 },
      right: { x: 22, y: -3, width: 28, height: 14 },
      up: { x: 0, y: -39, width: 14, height: 28 },
      down: { x: 0, y: 31, width: 14, height: 28 },
    } as const;
    const flash = offsets[direction];
    const burst = this.add
      .rectangle(
        player.x + flash.x,
        player.y + flash.y,
        flash.width,
        flash.height,
        0xffffff,
        1,
      )
      .setDepth(80)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add
      .circle(player.x + flash.x, player.y + flash.y, 8, 0xffffff, 1)
      .setDepth(81)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [burst, core],
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 90,
      ease: "Quad.easeOut",
      onComplete: () => {
        burst.destroy();
        core.destroy();
      },
    });
  };
}

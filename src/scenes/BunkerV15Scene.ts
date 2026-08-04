import Phaser from "phaser";
import {
  calculateRoomCamera,
  type CameraViewport,
  type RoomCameraResult,
} from "@/camera/RoomCamera";
import { BunkerV14Scene } from "./BunkerV14Scene";

const VERSION = "0.1.0.11";
const ROOM_CAMERA_DEBUG = false;
const FOLLOW_ZOOM = 1.4;

const roomCameraDebugEnabled = (): boolean => ROOM_CAMERA_DEBUG;

const ROOMS = [
  {
    name: "LIVING QUARTERS",
    bounds: new Phaser.Geom.Rectangle(64, 96, 576, 448),
  },
  {
    name: "TRAINING ROOM",
    bounds: new Phaser.Geom.Rectangle(1216, 96, 640, 480),
  },
] as const;

type RoomDefinition = (typeof ROOMS)[number];

export class BunkerV15Scene extends BunkerV14Scene {
  private activeRoom?: RoomDefinition;
  private cameraViewport!: CameraViewport;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;

  public override create(): void {
    super.create();
    this.updateVersionLabel();
    this.captureCameraViewport();
    this.createDebugDisplay();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.updateRoomCamera();
  }

  private updateVersionLabel(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  /** Captures the actual Phaser camera viewport, never CSS/window dimensions. */
  private captureCameraViewport(): void {
    const camera = this.cameras.main;
    camera.setViewport(0, 0, this.scale.gameSize.width, this.scale.gameSize.height);
    this.cameraViewport = {
      x: camera.x,
      y: camera.y,
      width: camera.width,
      height: camera.height,
    };
  }

  private readonly handleResize = (): void => {
    this.captureCameraViewport();
    if (this.activeRoom) this.frameRoom(this.activeRoom);
  };

  private findPlayer(): Phaser.Physics.Arcade.Sprite | undefined {
    return this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite &&
        child.texture.key.startsWith("survivor-"),
    );
  }

  private updateRoomCamera(): void {
    const player = this.findPlayer();
    if (!player) return;

    const room = ROOMS.find((candidate) =>
      candidate.bounds.contains(player.x, player.y),
    );

    if (room) {
      if (room !== this.activeRoom) this.frameRoom(room);
    } else if (this.activeRoom) {
      this.restoreFollowCamera(player);
    }

    this.updateDebugDisplay(player, room);
  }

  /**
   * The only room-framing entry point. Player position is deliberately absent
   * from the calculation. The result depends solely on the room rectangle and
   * the current Phaser camera viewport.
   */
  private frameRoom(room: RoomDefinition): void {
    const camera = this.cameras.main;
    const result = calculateRoomCamera(room.bounds, this.cameraViewport);

    camera.stopFollow();
    camera.roundPixels = false;
    camera.setViewport(
      result.viewport.x,
      result.viewport.y,
      result.viewport.width,
      result.viewport.height,
    );
    camera.setZoom(result.zoom);
    camera.setScroll(result.scrollX, result.scrollY);
    this.activeRoom = room;
  }

  private restoreFollowCamera(player: Phaser.Physics.Arcade.Sprite): void {
    const camera = this.cameras.main;
    camera.setViewport(
      this.cameraViewport.x,
      this.cameraViewport.y,
      this.cameraViewport.width,
      this.cameraViewport.height,
    );
    camera.setZoom(FOLLOW_ZOOM);
    camera.roundPixels = true;
    camera.startFollow(player, true, 0.08, 0.08);
    this.activeRoom = undefined;
  }

  private createDebugDisplay(): void {
    if (!roomCameraDebugEnabled()) return;
    this.debugGraphics = this.add.graphics().setDepth(1000);
    this.debugText = this.add
      .text(8, 8, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 6, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  private updateDebugDisplay(
    player: Phaser.Physics.Arcade.Sprite,
    room?: RoomDefinition,
  ): void {
    if (!roomCameraDebugEnabled()) return;
    const graphics = this.debugGraphics;
    const text = this.debugText;
    if (!graphics || !text) return;

    const camera = this.cameras.main;
    graphics.clear();

    if (room) {
      graphics.lineStyle(3 / camera.zoom, 0x00ff66, 1);
      graphics.strokeRectShape(room.bounds);
    }

    graphics.lineStyle(3 / camera.zoom, 0x3b82f6, 1);
    graphics.strokeRectShape(camera.worldView);
    graphics.fillStyle(0xff3333, 1);
    graphics.fillCircle(camera.midPoint.x, camera.midPoint.y, 5 / camera.zoom);
    graphics.fillStyle(0xffe600, 1);
    graphics.fillCircle(player.x, player.y, 6 / camera.zoom);

    const result: RoomCameraResult | undefined = room
      ? calculateRoomCamera(room.bounds, this.cameraViewport)
      : undefined;

    text.setText([
      `MODE: ${room ? "STATIC ROOM" : "FOLLOW"}`,
      `CAMERA viewport: ${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}, ${camera.width.toFixed(2)} × ${camera.height.toFixed(2)}`,
      `CAMERA scroll: ${camera.scrollX.toFixed(2)}, ${camera.scrollY.toFixed(2)}`,
      `CAMERA world: ${camera.worldView.x.toFixed(2)}, ${camera.worldView.y.toFixed(2)}, ${camera.worldView.width.toFixed(2)} × ${camera.worldView.height.toFixed(2)}`,
      `CAMERA centre: ${camera.midPoint.x.toFixed(2)}, ${camera.midPoint.y.toFixed(2)}`,
      `PLAYER: ${player.x.toFixed(2)}, ${player.y.toFixed(2)}`,
      room
        ? `ROOM ${room.name}: ${room.bounds.x}, ${room.bounds.y}, ${room.bounds.width} × ${room.bounds.height}`
        : "ROOM: none",
      result
        ? `CALCULATED: scroll ${result.scrollX.toFixed(2)}, ${result.scrollY.toFixed(2)} · zoom ${result.zoom.toFixed(6)}`
        : "CALCULATED: follow camera",
    ]);
  }
}

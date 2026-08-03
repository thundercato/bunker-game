import Phaser from "phaser";
import { BunkerV11Scene } from "./BunkerV11Scene";

const VERSION = "0.1.0.5";
const LIVING_ROOM = new Phaser.Geom.Rectangle(64, 96, 576, 448);
const TRAINING_ROOM = new Phaser.Geom.Rectangle(1216, 96, 640, 480);

export class BunkerV12Scene extends BunkerV11Scene {
  public override create(): void {
    super.create();
    this.updateVersionLabelsV12();
    this.installViewportFixes();
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    this.correctFramedRoomCamera();
  }

  private updateVersionLabelsV12(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
  }

  private correctFramedRoomCamera(): void {
    const player = this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite &&
        child.texture.key.startsWith("survivor-"),
    );
    if (!player) return;

    const room = [LIVING_ROOM, TRAINING_ROOM].find((candidate) =>
      candidate.contains(player.x, player.y),
    );
    if (!room) return;

    const camera = this.cameras.main;
    const targetZoom = Math.min(
      camera.width / room.width,
      camera.height / room.height,
    );
    camera.zoom = Phaser.Math.Linear(camera.zoom, targetZoom, 0.16);
    camera.scrollX = Phaser.Math.Linear(
      camera.scrollX,
      room.centerX - camera.width / (2 * camera.zoom),
      0.16,
    );
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, room.y, 0.16);
  }

  private installViewportFixes(): void {
    if (document.querySelector("#v12-viewport-fixes")) return;
    const style = document.createElement("style");
    style.id = "v12-viewport-fixes";
    style.textContent = `
      .game-overlay{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        padding:1.2%!important;
      }
      .storage-panel,.backpack-panel,.firearm-inventory,.inventory-panel-v7,.item-panel,.firearm-item-panel{
        width:97%!important;
        height:96%!important;
        max-height:96%!important;
        top:auto!important;
        transform:none!important;
      }
      .item-panel,.firearm-item-panel{
        padding:1.6% 1.8%!important;
        grid-template-rows:minmax(54px,12%) minmax(0,1fr)!important;
      }
      .item-panel>header,.firearm-item-panel>header{margin:0 0 .6%!important}
      .item-panel .item-art,.firearm-item-panel .firearm-art{height:60%!important}
      .item-panel .item-info,.firearm-item-panel .item-info{
        left:1.8%!important;
        bottom:2%!important;
        width:64%!important;
        height:24%!important;
      }
      .item-panel .item-actions,.firearm-item-panel .item-actions{
        justify-content:flex-start!important;
        padding-top:5%!important;
        padding-bottom:1%!important;
      }
      .item-panel .item-actions button,.firearm-item-panel .item-actions button{
        flex:1 1 0!important;
        max-height:17%!important;
      }
      .storage-grid{top:15%!important;bottom:2%!important}
      .backpack-grid{top:15%!important;bottom:2%!important}
      .storage-panel header,.backpack-panel header,.firearm-inventory header{height:12%!important}
      .storage-panel>.overlay-back,.backpack-panel>.overlay-back,.firearm-inventory>.overlay-back{bottom:2%!important}

      @supports (height:100dvh){
        html,body{height:100dvh!important;max-height:100dvh!important}
      }
    `;
    document.head.append(style);
  }
}

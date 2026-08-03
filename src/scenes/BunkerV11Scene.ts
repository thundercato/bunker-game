import Phaser from "phaser";
import { BunkerV10Scene } from "./BunkerV10Scene";

const VERSION = "0.1.0.4";

export class BunkerV11Scene extends BunkerV10Scene {
  public override create(): void {
    super.create();
    this.updateVersionLabelsV11();
    this.installNoScrollLayouts();
  }

  private updateVersionLabelsV11(): void {
    const badge = document.querySelector<HTMLElement>(".start-version");
    if (badge) badge.textContent = `BUNKER v${VERSION}`;
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.Text &&
        child.text.startsWith("BUNKER v")
      ) {
        child.setText("BUNKER GAME");
      }
    }
  }

  private installNoScrollLayouts(): void {
    if (document.querySelector("#v11-no-scroll-layouts")) return;
    const style = document.createElement("style");
    style.id = "v11-no-scroll-layouts";
    style.textContent = `
      html,body,#app{overflow:hidden!important;overscroll-behavior:none}
      .game-overlay{overflow:hidden!important;padding:2.2vh 2.2vw!important;box-sizing:border-box}
      .game-overlay.is-open{align-items:center!important;justify-content:center!important}
      .game-overlay *{box-sizing:border-box}

      .storage-panel,.backpack-panel,.firearm-inventory,.inventory-panel-v7,.item-panel,.firearm-item-panel{
        width:min(94vw,1500px)!important;
        height:min(92vh,820px)!important;
        max-width:none!important;
        max-height:none!important;
        overflow:hidden!important;
        margin:0!important;
        padding:2.5vh 2.2vw!important;
        position:relative!important;
      }
      .storage-panel header,.backpack-panel header,.firearm-inventory header{
        height:13%!important;
        margin:0!important;
      }
      .storage-panel header h2,.backpack-panel header h2,.firearm-inventory header h2{
        margin:0!important;
        font-size:clamp(24px,4.2vh,48px)!important;
        line-height:1!important;
      }
      .storage-panel header p,.backpack-panel header p,.firearm-inventory header p{
        margin:.8vh 0 0!important;
        font-size:clamp(13px,2.2vh,24px)!important;
      }

      .storage-grid{
        position:absolute!important;
        left:2.2vw!important;
        top:17%!important;
        right:13vw!important;
        bottom:3%!important;
        display:grid!important;
        grid-template-columns:repeat(6,minmax(0,1fr))!important;
        grid-template-rows:repeat(3,minmax(0,1fr))!important;
        gap:1.1vh 1vw!important;
        margin:0!important;
      }
      .backpack-grid{
        position:absolute!important;
        left:3vw!important;
        top:17%!important;
        width:58%!important;
        bottom:3%!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        grid-template-rows:repeat(4,minmax(0,1fr))!important;
        gap:1.1vh 1vw!important;
        margin:0!important;
      }
      .storage-cell{
        width:100%!important;
        height:100%!important;
        min-width:0!important;
        min-height:0!important;
        padding:.6vh .4vw!important;
        font-size:clamp(9px,1.65vh,18px)!important;
      }
      .storage-cell>span{font-size:clamp(9px,1.55vh,17px)!important}
      .storage-cell:not(:disabled){font-size:clamp(22px,4.4vh,48px)!important}

      .storage-panel>.overlay-back,.backpack-panel>.overlay-back,.firearm-inventory>.overlay-back{
        position:absolute!important;
        right:2.2vw!important;
        bottom:3%!important;
        width:9.5vw!important;
        min-width:105px!important;
        height:13%!important;
        margin:0!important;
      }

      .item-panel,.firearm-item-panel{
        display:grid!important;
        grid-template-columns:minmax(0,2fr) minmax(230px,.9fr)!important;
        grid-template-rows:auto 1fr!important;
        column-gap:2.2vw!important;
      }
      .item-panel>header,.firearm-item-panel>header{
        grid-column:1/3!important;
        margin:0 0 1.5vh!important;
      }
      .item-panel>header h2,.firearm-item-panel>header h2{
        margin:0!important;
        font-size:clamp(25px,4.2vh,48px)!important;
      }
      .item-panel>header p,.firearm-item-panel>header p{
        margin:.7vh 0 0!important;
        font-size:clamp(13px,2vh,22px)!important;
      }
      .item-panel .item-art,.firearm-item-panel .firearm-art{
        grid-column:1!important;
        grid-row:2!important;
        width:100%!important;
        height:58%!important;
        min-height:0!important;
        font-size:clamp(70px,16vh,165px)!important;
        margin:0!important;
      }
      .item-panel .item-info,.firearm-item-panel .item-info{
        position:absolute!important;
        left:2.2vw!important;
        bottom:3%!important;
        width:63%!important;
        height:25%!important;
        overflow:hidden!important;
        margin:0!important;
        padding:1.4vh 1.2vw!important;
        font-size:clamp(11px,1.75vh,18px)!important;
      }
      .item-panel .item-info p,.firearm-item-panel .item-info p{margin:0 0 .7vh!important}
      .item-panel .item-info ul,.firearm-item-panel .item-info ul{margin:0!important;padding-left:1.6em!important}
      .item-panel .item-actions,.firearm-item-panel .item-actions{
        grid-column:2!important;
        grid-row:2!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        justify-content:center!important;
        gap:1.1vh!important;
        overflow:hidden!important;
        margin:0!important;
        padding:0!important;
      }
      .item-panel .item-actions button,.firearm-item-panel .item-actions button{
        width:100%!important;
        min-height:0!important;
        height:auto!important;
        flex:0 1 8.2vh!important;
        margin:0!important;
        padding:1vh .8vw!important;
        font-size:clamp(11px,1.8vh,18px)!important;
      }

      .inventory-panel-v7{overflow:hidden!important}
      .inventory-panel-v7 .overlay-back{position:absolute!important;right:2.2vw!important;bottom:3%!important}

      @media (max-aspect-ratio: 4/3){
        .storage-panel,.backpack-panel,.firearm-inventory,.item-panel,.firearm-item-panel{width:96vw!important;height:90vh!important}
        .storage-grid{right:14vw!important}
        .backpack-grid{width:60%!important}
        .item-panel,.firearm-item-panel{grid-template-columns:minmax(0,1.7fr) minmax(190px,1fr)!important}
      }
    `;
    document.head.append(style);
  }
}

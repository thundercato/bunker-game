import { writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);

const scene = `import Phaser from "phaser";
import { BunkerV18Scene } from "./BunkerV18Scene";

type EnemyKind = "spider" | "rat" | "lurker";
type EnemyState = {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: EnemyKind;
  health: number;
  nextTurnAt: number;
  collider?: Phaser.Physics.Arcade.Collider;
};
type SearchableState = {
  body: Phaser.GameObjects.Container;
  label: string;
  duration: number;
  searched: boolean;
};
type Runtime = {
  uiOpen: boolean;
  health: number;
  knifeLocation: "storage" | "backpack" | "armed" | "world";
  emitState: () => void;
};

const CELL = 48;
const COLS = 49;
const ROWS = 33;
const DOOR_RANGE = 72;
const EXIT_RANGE = 76;
const SEARCH_RANGE = 68;
const ENEMY_DAMAGE = 12;

export class BunkerV19Scene extends BunkerV18Scene {
  private entranceDoor!: Phaser.GameObjects.Container;
  private entrancePrompt!: Phaser.GameObjects.Text;
  private tunnelRoot?: Phaser.GameObjects.Container;
  private tunnelWalls?: Phaser.Physics.Arcade.StaticGroup;
  private tunnelCollider?: Phaser.Physics.Arcade.Collider;
  private exitMarker?: Phaser.GameObjects.Container;
  private exitPrompt?: Phaser.GameObjects.Text;
  private searchPrompt?: Phaser.GameObjects.Text;
  private enemies: EnemyState[] = [];
  private searchables: SearchableState[] = [];
  private player?: Phaser.Physics.Arcade.Sprite;
  private inTunnels = false;
  private tunnelOrigin = new Phaser.Math.Vector2(0, 0);
  private lastFacing = new Phaser.Math.Vector2(0, 1);
  private useHeld = false;
  private stabHeld = false;
  private tunnelTransitioning = false;
  private nextContactDamageAt = 0;
  private searching = false;
  private sludgeCells = new Set<string>();
  private medical = { bandage: 0, firstAid: 0, painkillers: 0, antiseptic: 0 };

  public override create(): void {
    super.create();
    this.player = this.findPlayer();
    this.runtime().knifeLocation = "armed";
    this.medical = this.loadMedical();
    this.createEntranceDoor();
    window.addEventListener("bunker-gunshot", this.onGunshot);
    window.addEventListener("bunker-touch-attack", this.onTouchAttack);
    window.addEventListener("bunker-use-bandage", this.useBandage);
    window.addEventListener("bunker-use-first-aid", this.useFirstAid);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("bunker-gunshot", this.onGunshot);
      window.removeEventListener("bunker-touch-attack", this.onTouchAttack);
      window.removeEventListener("bunker-use-bandage", this.useBandage);
      window.removeEventListener("bunker-use-first-aid", this.useFirstAid);
      this.destroyTunnel();
    });
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    const player = this.player ?? this.findPlayer();
    if (!player) return;
    this.player = player;
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.lengthSq() > 4) this.lastFacing.set(body.velocity.x, body.velocity.y).normalize();

    const gamepad = navigator.getGamepads()[0];
    const usePressed = (this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown ?? false) || (gamepad?.buttons[2]?.pressed ?? false);
    if (usePressed && !this.useHeld && !this.runtime().uiOpen && !this.tunnelTransitioning) {
      if (this.inTunnels && this.nearExit(player)) this.completeDemo();
      else if (this.inTunnels) {
        const searchable = this.nearestSearchable(player);
        if (searchable) this.searchObject(searchable);
      } else if (this.nearEntrance(player)) this.enterTunnels();
    }
    this.useHeld = usePressed;

    const stabPressed = (gamepad?.buttons[0]?.pressed ?? false) || (this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).isDown ?? false);
    if (this.inTunnels && stabPressed && !this.stabHeld) this.tryStab();
    this.stabHeld = stabPressed;

    this.entrancePrompt.setVisible(!this.inTunnels && !this.runtime().uiOpen && this.nearEntrance(player));
    this.exitPrompt?.setVisible(this.inTunnels && !this.runtime().uiOpen && this.nearExit(player));
    const nearby = this.inTunnels ? this.nearestSearchable(player) : undefined;
    this.searchPrompt?.setVisible(Boolean(nearby) && !this.runtime().uiOpen && !this.searching);
    if (nearby && this.searchPrompt) this.searchPrompt.setPosition(nearby.body.x, nearby.body.y - 48).setText(nearby.searched ? "SEARCHED" : "USE · SEARCH");

    if (this.inTunnels) {
      this.updateEnemies(time, delta);
      this.applySludgeSlow(player, body);
      this.checkEnemyContact(time, player);
      this.cameras.main.centerOn(player.x, player.y);
    }
  }

  private runtime(): Runtime { return this as unknown as Runtime; }

  private findPlayer(): Phaser.Physics.Arcade.Sprite | undefined {
    return this.children.list.find((child): child is Phaser.Physics.Arcade.Sprite => child instanceof Phaser.Physics.Arcade.Sprite && child.texture.key.startsWith("survivor-"));
  }

  private createEntranceDoor(): void {
    const bounds = this.physics.world.bounds;
    const x = bounds.centerX;
    const y = bounds.bottom - 42;
    const frame = this.add.rectangle(0, 0, 70, 18, 0x182128).setStrokeStyle(3, 0x77848a);
    const hatch = this.add.rectangle(0, -4, 50, 12, 0x3e4b50).setStrokeStyle(2, 0x101619);
    const lamp = this.add.circle(0, -17, 4, 0x98d87a).setAlpha(0.75);
    this.entranceDoor = this.add.container(x, y, [frame, hatch, lamp]).setDepth(20);
    this.entrancePrompt = this.add.text(x, y - 34, "USE · ENTER TUNNELS", { fontFamily: "monospace", fontSize: "12px", color: "#e0f3e5", backgroundColor: "#07100ddd", padding: { x: 7, y: 4 } }).setOrigin(0.5).setDepth(50).setVisible(false);
    if (this.player) this.player.setPosition(x, y - 90);
  }

  private nearEntrance(player: Phaser.Physics.Arcade.Sprite): boolean { return Phaser.Math.Distance.Between(player.x, player.y, this.entranceDoor.x, this.entranceDoor.y) <= DOOR_RANGE; }
  private nearExit(player: Phaser.Physics.Arcade.Sprite): boolean { return Boolean(this.exitMarker) && Phaser.Math.Distance.Between(player.x, player.y, this.exitMarker!.x, this.exitMarker!.y) <= EXIT_RANGE; }

  private enterTunnels(): void {
    const player = this.player;
    if (!player || this.tunnelTransitioning) return;
    this.tunnelTransitioning = true;
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0); body.enable = false;
    const camera = this.cameras.main;
    camera.fadeOut(500, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.destroyTunnel(); this.inTunnels = true;
      const bunkerWorld = this.physics.world.bounds;
      this.tunnelOrigin.set(bunkerWorld.right + 640, bunkerWorld.top + 320);
      this.generateTunnel();
      const width = COLS * CELL; const height = ROWS * CELL;
      this.physics.world.setBounds(this.tunnelOrigin.x, this.tunnelOrigin.y, width, height);
      player.setPosition(this.tunnelOrigin.x + CELL * 1.5, this.tunnelOrigin.y + CELL * 1.5);
      body.enable = true; body.setVelocity(0, 0); player.setCollideWorldBounds(true);
      camera.stopFollow(); camera.removeBounds(); camera.setDeadzone(0, 0); camera.setZoom(1); camera.startFollow(player, true, 1, 1, 0, 0); camera.centerOn(player.x, player.y);
      camera.fadeIn(500, 0, 0, 0);
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => { this.tunnelTransitioning = false; this.toast("THE HATCH CLANGS SHUT BEHIND YOU"); });
    });
  }

  private generateTunnel(): void {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(true) as boolean[]);
    const stack: Array<[number, number]> = [[1, 1]]; grid[1]![1] = false;
    const directions: Array<[number, number]> = [[2,0],[-2,0],[0,2],[0,-2]];
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1]!;
      const choices = directions.map(([dx,dy]) => [cx+dx,cy+dy,dx,dy] as const).filter(([nx,ny]) => nx>0 && ny>0 && nx<COLS-1 && ny<ROWS-1 && grid[ny]![nx]);
      if (!choices.length) { stack.pop(); continue; }
      const [nx,ny,dx,dy] = Phaser.Utils.Array.GetRandom(choices);
      grid[cy+dy/2]![cx+dx/2] = false; grid[ny]![nx] = false; stack.push([nx,ny]);
    }

    this.carveLoops(grid);
    const deadEnds = this.findDeadEnds(grid).filter((cell) => !(cell.x === 1 && cell.y === 1));
    for (const cell of deadEnds) this.carveLootRoom(grid, cell.x, cell.y);

    const root = this.add.container(0, 0).setDepth(1); this.tunnelRoot = root; this.tunnelWalls = this.physics.add.staticGroup();
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      const wx=this.tunnelOrigin.x+x*CELL+CELL/2; const wy=this.tunnelOrigin.y+y*CELL+CELL/2;
      if (grid[y]![x]) {
        const wall=this.add.rectangle(wx,wy,CELL,CELL,0x202629).setStrokeStyle(1,0x343d40).setDepth(3); this.physics.add.existing(wall,true); this.tunnelWalls.add(wall); root.add(wall);
      } else {
        const sludge = Math.random() < 0.08 && !(x===1&&y===1);
        if (sludge) this.sludgeCells.add(`${x},${y}`);
        const floor=this.add.rectangle(wx,wy,CELL,CELL,sludge?0x27352d:0x0c1113).setStrokeStyle(1,sludge?0x425744:0x151d20).setDepth(1); root.add(floor);
        if (sludge) root.add(this.add.ellipse(wx,wy,CELL*0.72,CELL*0.34,0x4f6249,0.35).setDepth(2));
      }
    }
    if (this.player) this.tunnelCollider=this.physics.add.collider(this.player,this.tunnelWalls);

    const exitCell=this.farthestOpenCell(grid,1,1); const exitX=this.tunnelOrigin.x+exitCell.x*CELL+CELL/2; const exitY=this.tunnelOrigin.y+exitCell.y*CELL+CELL/2;
    const rails=this.add.rectangle(0,0,34,46,0x1d2422).setStrokeStyle(3,0xa8b39e); const rungs=[-14,-4,6,16].map(y=>this.add.rectangle(0,y,25,3,0xb8c1ac));
    this.exitMarker=this.add.container(exitX,exitY,[rails,...rungs]).setDepth(12);
    this.exitPrompt=this.add.text(exitX,exitY-52,"USE · CLIMB LADDER",{fontFamily:"monospace",fontSize:"12px",color:"#edffe6",backgroundColor:"#07100ddd",padding:{x:7,y:4}}).setOrigin(0.5).setDepth(50).setVisible(false);
    root.add([this.exitMarker,this.exitPrompt]);
    this.searchPrompt=this.add.text(0,0,"USE · SEARCH",{fontFamily:"monospace",fontSize:"12px",color:"#ffe9b0",backgroundColor:"#151006dd",padding:{x:7,y:4}}).setOrigin(0.5).setDepth(60).setVisible(false); root.add(this.searchPrompt);

    this.createSearchables(deadEnds, root);
    const openCells:Array<{x:number;y:number}>=[];
    for(let y=1;y<ROWS-1;y++) for(let x=1;x<COLS-1;x++) if(!grid[y]![x]&&(x!==1||y!==1)&&(x!==exitCell.x||y!==exitCell.y)) openCells.push({x,y});
    Phaser.Utils.Array.Shuffle(openCells);
    const enemyCount=Phaser.Math.Between(28,42);
    for(const cell of openCells.slice(0,enemyCount)) this.spawnEnemy(cell.x,cell.y);
  }

  private carveLoops(grid:boolean[][]):void {
    for(let y=2;y<ROWS-2;y++) for(let x=2;x<COLS-2;x++) if(grid[y]![x] && Math.random()<0.055) {
      const horizontal=!grid[y]![x-1]&&!grid[y]![x+1]; const vertical=!grid[y-1]![x]&&!grid[y+1]![x];
      if(horizontal||vertical) grid[y]![x]=false;
    }
  }

  private findDeadEnds(grid:boolean[][]):Array<{x:number;y:number}> {
    const result:Array<{x:number;y:number}>=[];
    for(let y=1;y<ROWS-1;y++) for(let x=1;x<COLS-1;x++) if(!grid[y]![x]) {
      const exits=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!grid[y+dy]![x+dx]).length;
      if(exits===1) result.push({x,y});
    }
    return result;
  }

  private carveLootRoom(grid:boolean[][],x:number,y:number):void {
    const openDir=([[1,0],[-1,0],[0,1],[0,-1]] as const).find(([dx,dy])=>!grid[y+dy]![x+dx]);
    if(!openDir) return;
    const [odx,ody]=openDir; const dx=-odx; const dy=-ody;
    const cx=x+dx*2; const cy=y+dy*2;
    if(cx<2||cy<2||cx>COLS-3||cy>ROWS-3) return;
    grid[y+dy]![x+dx]=false;
    for(let ry=-1;ry<=1;ry++) for(let rx=-1;rx<=1;rx++) grid[cy+ry]![cx+rx]=false;
  }

  private createSearchables(deadEnds:Array<{x:number;y:number}>,root:Phaser.GameObjects.Container):void {
    const labels=["RUSTED LOCKER","FILING CABINET","BEDSIDE DRAWERS","OLD DESK","WARDROBE","SUPPLY CRATE","MEDICAL CABINET"];
    for(const cell of deadEnds) {
      const x=this.tunnelOrigin.x+cell.x*CELL+CELL/2; const y=this.tunnelOrigin.y+cell.y*CELL+CELL/2;
      const label=Phaser.Utils.Array.GetRandom(labels); const duration=label.includes("DRAWERS")?1000:label.includes("WARDROBE")?4000:Phaser.Math.Between(1500,3000);
      const door=this.add.rectangle(0,0,34,10,0x4b3d30).setStrokeStyle(2,0x8d7358); const furniture=this.add.rectangle(0,-24,30,24,label.includes("MEDICAL")?0x73827b:0x4a4037).setStrokeStyle(2,0x1a1714);
      const body=this.add.container(x,y,[door,furniture]).setDepth(8); root.add(body); this.searchables.push({body,label,duration,searched:false});
    }
  }

  private nearestSearchable(player:Phaser.Physics.Arcade.Sprite):SearchableState|undefined {
    return this.searchables.filter(item=>Phaser.Math.Distance.Between(player.x,player.y,item.body.x,item.body.y)<=SEARCH_RANGE).sort((a,b)=>Phaser.Math.Distance.Between(player.x,player.y,a.body.x,a.body.y)-Phaser.Math.Distance.Between(player.x,player.y,b.body.x,b.body.y))[0];
  }

  private searchObject(item:SearchableState):void {
    if(item.searched||this.searching) { if(item.searched) this.toast("ALREADY SEARCHED"); return; }
    this.searching=true; const player=this.player; if(!player)return; const body=player.body as Phaser.Physics.Arcade.Body; body.setVelocity(0,0); body.enable=false;
    const overlay=document.createElement("div"); overlay.className="inventory-toast survival-toast"; overlay.innerHTML=`<b>SEARCHING ${item.label}</b><div style="width:220px;height:8px;background:#222;margin-top:8px"><i style="display:block;height:100%;width:0;background:#d4b66a;transition:width ${item.duration}ms linear"></i></div>`; document.querySelector("#app")?.append(overlay);
    requestAnimationFrame(()=>{ const bar=overlay.querySelector<HTMLElement>("i"); if(bar)bar.style.width="100%"; });
    this.time.delayedCall(item.duration,()=>{ item.searched=true; this.searching=false; body.enable=true; overlay.remove(); this.awardLoot(item.label); });
  }

  private awardLoot(source:string):void {
    const roll=Math.random(); let found:string;
    if(source.includes("MEDICAL")||roll<0.12){ this.medical.bandage+=1; found="BANDAGE (+25 HEALTH)"; }
    else if(roll<0.16){ this.medical.firstAid+=1; found="FIRST AID KIT (+90 HEALTH)"; }
    else if(roll<0.25){ this.medical.painkillers+=1; found="PAINKILLERS (+15 HEALTH)"; }
    else if(roll<0.33){ this.medical.antiseptic+=1; found="ANTISEPTIC"; }
    else if(roll<0.58) found=`${Phaser.Math.Between(1,8)} LOOSE 9MM ROUNDS`;
    else if(roll<0.76) found=Phaser.Utils.Array.GetRandom(["TIN OF BEANS","TINNED PINEAPPLE","TINNED SPAGHETTI","COCONUT MILK","TOMATO SOUP","TINNED PEACHES"]);
    else if(roll<0.88) found="TORCH BATTERY";
    else if(roll<0.96) found="DAMAGED MAKAROV MAGAZINE";
    else found="NOTHING USEFUL";
    this.saveMedical(); this.toast(`FOUND: ${found}`);
  }

  private farthestOpenCell(grid:boolean[][],sx:number,sy:number):{x:number;y:number} {
    const queue=[{x:sx,y:sy,distance:0}]; const seen=new Set([`${sx},${sy}`]); let farthest=queue[0]!;
    while(queue.length){ const current=queue.shift()!; if(current.distance>farthest.distance)farthest=current;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const){ const nx=current.x+dx,ny=current.y+dy,key=`${nx},${ny}`; if(nx<0||ny<0||nx>=COLS||ny>=ROWS||grid[ny]![nx]||seen.has(key))continue; seen.add(key); queue.push({x:nx,y:ny,distance:current.distance+1}); }
    } return {x:farthest.x,y:farthest.y};
  }

  private spawnEnemy(cellX:number,cellY:number):void {
    const roll=Math.random(); const kind:EnemyKind=roll<0.48?"spider":roll<0.96?"rat":"lurker";
    const x=this.tunnelOrigin.x+cellX*CELL+CELL/2,y=this.tunnelOrigin.y+cellY*CELL+CELL/2,key=`tunnel-${kind}`;
    if(!this.textures.exists(key)){ const g=this.make.graphics({x:0,y:0,add:false});
      if(kind==="lurker"){g.fillStyle(0x403f3c,1).fillCircle(16,8,6).fillRect(10,14,12,26);g.lineStyle(4,0x403f3c).lineBetween(12,38,7,48).lineBetween(20,38,25,48);}
      else {g.fillStyle(kind==="spider"?0x17110f:0x6f6258,1).fillEllipse(16,16,kind==="spider"?18:25,kind==="spider"?13:12); if(kind==="spider"){g.lineStyle(2,0x2b211d);for(const side of[-1,1])for(const off of[-6,-2,2,6])g.lineBetween(16+side*6,16+off,16+side*14,16+off*1.6);}else{g.fillTriangle(4,13,10,8,11,16);g.lineStyle(2,0x9a8271).lineBetween(28,17,35,13);}}
      g.generateTexture(key,kind==="lurker"?32:36,kind==="lurker"?52:32);g.destroy(); }
    const sprite=this.physics.add.sprite(x,y,key).setDepth(9); sprite.setCollideWorldBounds(true); (sprite.body as Phaser.Physics.Arcade.Body).setSize(kind==="lurker"?20:24,kind==="lurker"?34:16).setOffset(6,kind==="lurker"?14:9);
    const collider=this.tunnelWalls?this.physics.add.collider(sprite,this.tunnelWalls):undefined; const health=kind==="spider"?1:kind==="rat"?2:3; this.enemies.push({sprite,kind,health,nextTurnAt:0,collider});
  }

  private updateEnemies(time:number,_delta:number):void { for(const enemy of this.enemies){ if(!enemy.sprite.active)continue; if(time>=enemy.nextTurnAt){ enemy.nextTurnAt=time+Phaser.Math.Between(550,1450); const angle=Phaser.Math.FloatBetween(0,Math.PI*2); const speed=enemy.kind==="rat"?42:enemy.kind==="spider"?32:18; enemy.sprite.setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed); } } }

  private checkEnemyContact(time:number,player:Phaser.Physics.Arcade.Sprite):void { if(time<this.nextContactDamageAt)return; const enemy=this.enemies.find(e=>e.sprite.active&&Phaser.Math.Distance.Between(player.x,player.y,e.sprite.x,e.sprite.y)<30); if(!enemy)return; this.nextContactDamageAt=time+900; const runtime=this.runtime(); runtime.health=Math.max(0,runtime.health-ENEMY_DAMAGE); runtime.emitState(); player.setAlpha(0.2); this.tweens.add({targets:player,alpha:1,duration:90,yoyo:true,repeat:5}); const dir=new Phaser.Math.Vector2(enemy.sprite.x-player.x,enemy.sprite.y-player.y).normalize(); enemy.sprite.setVelocity(dir.x*120,dir.y*120); this.toast(`${enemy.kind.toUpperCase()} ATTACK · -${ENEMY_DAMAGE} HEALTH`); }

  private applySludgeSlow(player:Phaser.Physics.Arcade.Sprite,body:Phaser.Physics.Arcade.Body):void { const cx=Math.floor((player.x-this.tunnelOrigin.x)/CELL),cy=Math.floor((player.y-this.tunnelOrigin.y)/CELL); if(this.sludgeCells.has(`${cx},${cy}`))body.velocity.scale(0.75); }

  private readonly onGunshot=():void=>{ if(!this.inTunnels||!this.player)return; const origin=new Phaser.Math.Vector2(this.player.x,this.player.y),direction=this.lastFacing.clone().normalize(); let best:EnemyState|undefined,bestDistance=Infinity; for(const enemy of this.enemies){if(!enemy.sprite.active)continue;const offset=new Phaser.Math.Vector2(enemy.sprite.x-origin.x,enemy.sprite.y-origin.y),forward=offset.dot(direction);if(forward<=0||forward>700)continue;const lateral=Math.abs(offset.x*direction.y-offset.y*direction.x);if(lateral<=18&&forward<bestDistance){best=enemy;bestDistance=forward;}} if(best)this.damageEnemy(best,best.kind==="lurker"?2:99);};
  private readonly onTouchAttack=():void=>{if(this.inTunnels)window.setTimeout(()=>this.tryStab(),0);};
  private tryStab():void{if(!this.inTunnels||!this.player||this.runtime().knifeLocation!=="armed")return;const origin=new Phaser.Math.Vector2(this.player.x,this.player.y),direction=this.lastFacing.clone().normalize();const target=this.enemies.filter(e=>e.sprite.active).map(enemy=>({enemy,offset:new Phaser.Math.Vector2(enemy.sprite.x-origin.x,enemy.sprite.y-origin.y)})).filter(({offset})=>offset.length()<=58&&offset.dot(direction)>0).sort((a,b)=>a.offset.lengthSq()-b.offset.lengthSq())[0]?.enemy;if(target)this.damageEnemy(target,target.kind==="spider"?99:1);}
  private damageEnemy(enemy:EnemyState,amount:number):void{enemy.health-=amount;enemy.sprite.setTintFill(0xffffff);this.time.delayedCall(90,()=>enemy.sprite.clearTint());if(enemy.health>0)return;enemy.collider?.destroy();enemy.sprite.disableBody(true,true);this.toast(`${enemy.kind.toUpperCase()} KILLED`);}

  private readonly useBandage=():void=>this.heal("bandage",25,"BANDAGE APPLIED");
  private readonly useFirstAid=():void=>this.heal("firstAid",90,"FIRST AID USED");
  private heal(kind:"bandage"|"firstAid",amount:number,message:string):void{if(this.medical[kind]<=0){this.toast("NONE AVAILABLE");return;}const runtime=this.runtime();if(runtime.health>=100){this.toast("HEALTH ALREADY FULL");return;}this.medical[kind]-=1;runtime.health=Math.min(100,runtime.health+amount);runtime.emitState();this.saveMedical();this.toast(`${message} · +${amount} HEALTH`);}
  private loadMedical():typeof this.medical{try{return {...this.medical,...JSON.parse(localStorage.getItem("bunker-medical")??"{}")} as typeof this.medical;}catch{return this.medical;}}
  private saveMedical():void{localStorage.setItem("bunker-medical",JSON.stringify(this.medical));}

  private completeDemo():void{const overlay=document.querySelector<HTMLElement>(".game-overlay");if(!overlay)return;this.runtime().uiOpen=true;overlay.classList.add("is-open");const panel=document.createElement("div");panel.className="message-panel demo-complete";panel.innerHTML=`<h2>DEMO COMPLETE</h2><p>You found the ladder out.</p><p>Medical supplies: ${this.medical.bandage} bandages · ${this.medical.firstAid} first aid kits</p><button>RETURN TO BUNKER</button>`;panel.querySelector("button")?.addEventListener("click",()=>{overlay.classList.remove("is-open");overlay.replaceChildren();this.runtime().uiOpen=false;this.leaveTunnels();});overlay.replaceChildren(panel);}

  private leaveTunnels():void{const player=this.player;if(!player||this.tunnelTransitioning)return;this.tunnelTransitioning=true;const body=player.body as Phaser.Physics.Arcade.Body;body.setVelocity(0,0);body.enable=false;const camera=this.cameras.main;camera.fadeOut(500,0,0,0);camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>{this.inTunnels=false;this.destroyTunnel();const bounds=this.entranceDoor.scene.physics.world.bounds;this.physics.world.setBounds(0,0,bounds.width,bounds.height);player.setPosition(this.entranceDoor.x,this.entranceDoor.y-90);body.enable=true;body.setVelocity(0,0);camera.stopFollow();camera.setBounds(0,0,bounds.width,bounds.height);camera.startFollow(player,true,0.12,0.12);camera.fadeIn(500,0,0,0);camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,()=>{this.tunnelTransitioning=false;});});}

  private destroyTunnel():void{this.tunnelCollider?.destroy();this.tunnelCollider=undefined;for(const enemy of this.enemies){enemy.collider?.destroy();enemy.sprite.destroy();}this.enemies=[];this.searchables=[];this.sludgeCells.clear();this.tunnelWalls?.clear(true,true);this.tunnelWalls=undefined;this.tunnelRoot?.destroy(true);this.tunnelRoot=undefined;this.exitMarker=undefined;this.exitPrompt=undefined;this.searchPrompt=undefined;}
  private toast(message:string):void{window.dispatchEvent(new CustomEvent("bunker-toast",{detail:{message}}));const toast=document.createElement("div");toast.className="inventory-toast survival-toast";toast.textContent=message;document.querySelector("#app")?.append(toast);window.setTimeout(()=>toast.remove(),1700);}
}
`;

await writeFile(scenePath, scene, "utf8");

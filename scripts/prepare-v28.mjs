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
  roomId: number;
};
type RoomState = {
  id: number;
  door: Phaser.GameObjects.Container;
  prompt: Phaser.GameObjects.Text;
  open: boolean;
  furniture: SearchableState[];
};
type Runtime = {
  uiOpen: boolean;
  health: number;
  knifeLocation: "storage" | "backpack" | "armed" | "world";
  emitState: () => void;
  openBackpack?: () => void;
};

const CELL = 48;
const COLS = 49;
const ROWS = 33;
const DOOR_RANGE = 70;
const EXIT_RANGE = 74;
const SEARCH_RANGE = 62;
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
  private rooms: RoomState[] = [];
  private searchables: SearchableState[] = [];
  private player?: Phaser.Physics.Arcade.Sprite;
  private inTunnels = false;
  private tunnelOrigin = new Phaser.Math.Vector2(0, 0);
  private lastFacing = new Phaser.Math.Vector2(0, 1);
  private useHeld = false;
  private stabHeld = false;
  private selectHeld = false;
  private startHeld = false;
  private tunnelTransitioning = false;
  private nextContactDamageAt = 0;
  private searching = false;
  private pausedByMenu = false;
  private bunkerBounds?: Phaser.Geom.Rectangle;

  public override create(): void {
    super.create();
    this.player = this.findPlayer();
    this.runtime().knifeLocation = "armed";
    this.createEntranceDoor();
    window.addEventListener("bunker-gunshot", this.onGunshot);
    window.addEventListener("bunker-touch-attack", this.onTouchAttack);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("bunker-gunshot", this.onGunshot);
      window.removeEventListener("bunker-touch-attack", this.onTouchAttack);
      this.destroyTunnel();
    });
  }

  public override update(time: number, delta: number): void {
    if (!this.pausedByMenu) super.update(time, delta);
    const player = this.player ?? this.findPlayer();
    if (!player) return;
    this.player = player;
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.lengthSq() > 4) this.lastFacing.set(body.velocity.x, body.velocity.y).normalize();

    const gamepad = navigator.getGamepads()[0];
    const selectPressed = gamepad?.buttons[8]?.pressed ?? false;
    const startPressed = gamepad?.buttons[9]?.pressed ?? false;
    if (selectPressed && !this.selectHeld) this.toggleInventory();
    if (startPressed && !this.startHeld) this.togglePauseMenu();
    this.selectHeld = selectPressed;
    this.startHeld = startPressed;

    if (this.pausedByMenu || this.runtime().uiOpen || this.tunnelTransitioning) {
      body.setVelocity(0, 0);
      return;
    }

    const usePressed =
      (this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown ?? false) ||
      (gamepad?.buttons[2]?.pressed ?? false);
    if (usePressed && !this.useHeld) {
      if (this.inTunnels && this.nearExit(player)) this.completeDemo();
      else if (this.inTunnels) {
        const room = this.nearestClosedRoom(player);
        if (room) this.openRoom(room);
        else {
          const searchable = this.nearestSearchable(player);
          if (searchable) this.searchObject(searchable);
        }
      } else if (this.nearEntrance(player)) this.enterTunnels();
    }
    this.useHeld = usePressed;

    const stabPressed =
      (gamepad?.buttons[0]?.pressed ?? false) ||
      (this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).isDown ?? false);
    if (this.inTunnels && stabPressed && !this.stabHeld) this.tryStab();
    this.stabHeld = stabPressed;

    this.entrancePrompt.setVisible(!this.inTunnels && this.nearEntrance(player));
    this.exitPrompt?.setVisible(this.inTunnels && this.nearExit(player));
    for (const room of this.rooms) room.prompt.setVisible(this.inTunnels && !room.open && this.distanceTo(player, room.door) <= DOOR_RANGE);
    const nearby = this.inTunnels ? this.nearestSearchable(player) : undefined;
    this.searchPrompt?.setVisible(Boolean(nearby) && !this.searching);
    if (nearby && this.searchPrompt) this.searchPrompt.setPosition(nearby.body.x, nearby.body.y - 42).setText(nearby.searched ? "SEARCHED" : "USE · SEARCH");

    if (this.inTunnels) {
      this.updateEnemies(time, delta);
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

  private distanceTo(player: Phaser.Physics.Arcade.Sprite, object: Phaser.GameObjects.Container): number {
    return Phaser.Math.Distance.Between(player.x, player.y, object.x, object.y);
  }
  private nearEntrance(player: Phaser.Physics.Arcade.Sprite): boolean { return this.distanceTo(player, this.entranceDoor) <= DOOR_RANGE; }
  private nearExit(player: Phaser.Physics.Arcade.Sprite): boolean { return Boolean(this.exitMarker) && this.distanceTo(player, this.exitMarker!) <= EXIT_RANGE; }

  private enterTunnels(): void {
    const player = this.player;
    if (!player || this.tunnelTransitioning) return;
    this.tunnelTransitioning = true;
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0); body.enable = false;
    const camera = this.cameras.main;
    camera.fadeOut(450, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.destroyTunnel();
      this.inTunnels = true;
      this.bunkerBounds = new Phaser.Geom.Rectangle(this.physics.world.bounds.x, this.physics.world.bounds.y, this.physics.world.bounds.width, this.physics.world.bounds.height);
      this.tunnelOrigin.set(this.bunkerBounds.right + 640, this.bunkerBounds.top + 320);
      this.generateTunnel();
      this.physics.world.setBounds(this.tunnelOrigin.x, this.tunnelOrigin.y, COLS * CELL, ROWS * CELL);
      player.setPosition(this.tunnelOrigin.x + CELL * 1.5, this.tunnelOrigin.y + CELL * 1.5);
      body.enable = true; body.setVelocity(0, 0); player.setCollideWorldBounds(true);
      camera.stopFollow(); camera.removeBounds(); camera.setDeadzone(0, 0); camera.setZoom(1); camera.startFollow(player, true, 1, 1); camera.centerOn(player.x, player.y);
      camera.fadeIn(450, 0, 0, 0);
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => { this.tunnelTransitioning = false; this.toast("THE HATCH CLANGS SHUT BEHIND YOU"); });
    });
  }

  private generateTunnel(): void {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(true) as boolean[]);
    const stack: Array<[number, number]> = [[1, 1]];
    grid[1]![1] = false;
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
    const roomSeeds = deadEnds.filter(() => Math.random() < 0.82);
    for (const seed of roomSeeds) this.carveRoom(grid, seed);

    const root = this.add.container(0, 0).setDepth(1);
    this.tunnelRoot = root;
    this.tunnelWalls = this.physics.add.staticGroup();
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      const wx=this.tunnelOrigin.x+x*CELL+CELL/2; const wy=this.tunnelOrigin.y+y*CELL+CELL/2;
      if (grid[y]![x]) {
        const wall=this.add.rectangle(wx,wy,CELL,CELL,0x202629).setStrokeStyle(1,0x343d40).setDepth(3);
        this.physics.add.existing(wall,true); this.tunnelWalls.add(wall); root.add(wall);
      } else {
        const wet=Math.random()<0.1 && !(x===1&&y===1);
        root.add(this.add.rectangle(wx,wy,CELL,CELL,wet?0x26332e:0x0c1113).setStrokeStyle(1,wet?0x43564b:0x151d20).setDepth(1));
        if(wet) root.add(this.add.ellipse(wx,wy,CELL*0.75,CELL*0.28,0x526558,0.3).setDepth(2));
      }
    }
    if (this.player) this.tunnelCollider=this.physics.add.collider(this.player,this.tunnelWalls);

    this.createRooms(roomSeeds, root);
    const exitCell=this.farthestOpenCell(grid,1,1);
    const exitX=this.tunnelOrigin.x+exitCell.x*CELL+CELL/2; const exitY=this.tunnelOrigin.y+exitCell.y*CELL+CELL/2;
    const rails=this.add.rectangle(0,0,34,46,0x1d2422).setStrokeStyle(3,0xa8b39e);
    const rungs=[-14,-4,6,16].map((ry)=>this.add.rectangle(0,ry,25,3,0xb8c1ac));
    this.exitMarker=this.add.container(exitX,exitY,[rails,...rungs]).setDepth(12);
    this.exitPrompt=this.add.text(exitX,exitY-52,"USE · CLIMB LADDER",{fontFamily:"monospace",fontSize:"12px",color:"#edffe6",backgroundColor:"#07100ddd",padding:{x:7,y:4}}).setOrigin(0.5).setDepth(50).setVisible(false);
    this.searchPrompt=this.add.text(0,0,"USE · SEARCH",{fontFamily:"monospace",fontSize:"12px",color:"#ffe9b0",backgroundColor:"#151006dd",padding:{x:7,y:4}}).setOrigin(0.5).setDepth(60).setVisible(false);
    root.add([this.exitMarker,this.exitPrompt,this.searchPrompt]);

    const openCells:Array<{x:number;y:number}>=[];
    for(let y=1;y<ROWS-1;y++) for(let x=1;x<COLS-1;x++) if(!grid[y]![x]&&(x!==1||y!==1)&&(x!==exitCell.x||y!==exitCell.y)) openCells.push({x,y});
    Phaser.Utils.Array.Shuffle(openCells);
    for(const cell of openCells.slice(0,Phaser.Math.Between(28,42))) this.spawnEnemy(cell.x,cell.y);
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
      const exits=([[1,0],[-1,0],[0,1],[0,-1]] as const).filter(([dx,dy])=>!grid[y+dy]![x+dx]).length;
      if(exits===1) result.push({x,y});
    }
    return result;
  }

  private carveRoom(grid:boolean[][],seed:{x:number;y:number}):void {
    const openDir=([[1,0],[-1,0],[0,1],[0,-1]] as const).find(([dx,dy])=>!grid[seed.y+dy]![seed.x+dx]);
    if(!openDir) return;
    const [odx,ody]=openDir; const dx=-odx; const dy=-ody;
    const cx=seed.x+dx*2; const cy=seed.y+dy*2;
    if(cx<2||cy<2||cx>COLS-3||cy>ROWS-3) return;
    grid[seed.y+dy]![seed.x+dx]=false;
    const radius=Math.random()<0.2?2:1;
    for(let ry=-radius;ry<=radius;ry++) for(let rx=-radius;rx<=radius;rx++) {
      const gx=cx+rx; const gy=cy+ry;
      if(gx>0&&gy>0&&gx<COLS-1&&gy<ROWS-1) grid[gy]![gx]=false;
    }
  }

  private createRooms(seeds:Array<{x:number;y:number}>,root:Phaser.GameObjects.Container):void {
    const furniture=[
      {label:"BEDSIDE DRAWERS",duration:1000,colour:0x4c3d31},
      {label:"OLD DESK",duration:2000,colour:0x514437},
      {label:"RUSTED LOCKER",duration:2500,colour:0x4f5b59},
      {label:"FILING CABINET",duration:2200,colour:0x58605d},
      {label:"WARDROBE",duration:4000,colour:0x463a31},
      {label:"SUPPLY CRATE",duration:1800,colour:0x5b4a32},
      {label:"MEDICAL CABINET",duration:1600,colour:0x68746f},
    ];
    let roomId=0;
    for(const seed of seeds) {
      const x=this.tunnelOrigin.x+seed.x*CELL+CELL/2; const y=this.tunnelOrigin.y+seed.y*CELL+CELL/2;
      const slab=this.add.rectangle(0,0,38,10,0x5d4734).setStrokeStyle(2,0xa18563);
      const handle=this.add.circle(12,0,2,0xd4b67d);
      const door=this.add.container(x,y,[slab,handle]).setDepth(9);
      const prompt=this.add.text(x,y-38,"USE · OPEN ROOM",{fontFamily:"monospace",fontSize:"11px",color:"#ffe9b0",backgroundColor:"#151006dd",padding:{x:6,y:3}}).setOrigin(0.5).setDepth(55).setVisible(false);
      const state:RoomState={id:roomId++,door,prompt,open:false,furniture:[]};
      const count=Phaser.Math.Between(2,5);
      for(let i=0;i<count;i++) {
        const spec=Phaser.Utils.Array.GetRandom(furniture);
        const angle=(Math.PI*2*i)/count;
        const fx=x+Math.cos(angle)*Phaser.Math.Between(42,78);
        const fy=y+Math.sin(angle)*Phaser.Math.Between(42,78);
        const shape=this.add.rectangle(0,0,30+Phaser.Math.Between(0,18),22+Phaser.Math.Between(0,18),spec.colour).setStrokeStyle(2,0x171411);
        const label=this.add.text(0,0,spec.label.split(" ")[0]!,{fontFamily:"monospace",fontSize:"7px",color:"#d8cfbf"}).setOrigin(0.5);
        const body=this.add.container(fx,fy,[shape,label]).setDepth(8).setVisible(false);
        const searchable:SearchableState={body,label:spec.label,duration:spec.duration,searched:false,roomId:state.id};
        state.furniture.push(searchable); this.searchables.push(searchable); root.add(body);
      }
      this.rooms.push(state); root.add([door,prompt]);
    }
  }

  private nearestClosedRoom(player:Phaser.Physics.Arcade.Sprite):RoomState|undefined {
    return this.rooms.filter((room)=>!room.open&&this.distanceTo(player,room.door)<=DOOR_RANGE).sort((a,b)=>this.distanceTo(player,a.door)-this.distanceTo(player,b.door))[0];
  }

  private openRoom(room:RoomState):void {
    room.open=true;
    room.door.setAngle(90).setAlpha(0.35);
    room.prompt.setVisible(false);
    for(const item of room.furniture) item.body.setVisible(true);
    this.toast("ROOM OPENED · SEARCH EVERYTHING");
  }

  private nearestSearchable(player:Phaser.Physics.Arcade.Sprite):SearchableState|undefined {
    return this.searchables.filter((item)=>item.body.visible&&Phaser.Math.Distance.Between(player.x,player.y,item.body.x,item.body.y)<=SEARCH_RANGE).sort((a,b)=>Phaser.Math.Distance.Between(player.x,player.y,a.body.x,a.body.y)-Phaser.Math.Distance.Between(player.x,player.y,b.body.x,b.body.y))[0];
  }

  private searchObject(item:SearchableState):void {
    if(item.searched){this.toast("ALREADY SEARCHED");return;}
    this.searching=true; this.runtime().uiOpen=true;
    const player=this.player; if(player)(player.body as Phaser.Physics.Arcade.Body).setVelocity(0,0);
    const overlay=document.querySelector<HTMLElement>(".game-overlay");
    if(!overlay){this.searching=false;this.runtime().uiOpen=false;return;}
    overlay.classList.add("is-open");
    const panel=document.createElement("div"); panel.className="message-panel search-panel";
    panel.innerHTML="<h2>SEARCHING</h2><p>"+item.label+"</p><div class='search-progress'><i></i></div>";
    overlay.replaceChildren(panel);
    const bar=panel.querySelector<HTMLElement>(".search-progress i");
    if(bar){bar.style.transitionDuration=String(item.duration)+"ms";requestAnimationFrame(()=>{bar.style.width="100%";});}
    this.time.delayedCall(item.duration,()=>{
      item.searched=true; this.searching=false; this.runtime().uiOpen=false;
      overlay.classList.remove("is-open"); overlay.replaceChildren();
      this.grantLoot(); item.body.setAlpha(0.45); this.toast(item.label+" SEARCHED");
    });
  }

  private grantLoot():void {
    const roll=Math.random();
    const loot=roll<0.18?"BANDAGES":roll<0.25?"FIRST AID KIT":roll<0.4?"LOOSE AMMUNITION":roll<0.55?"TINNED FOOD":roll<0.7?"BOTTLED DRINK":roll<0.82?"BATTERIES":roll<0.93?"NOTHING USEFUL":"DAMAGED MAGAZINE";
    window.dispatchEvent(new CustomEvent("bunker-loot-found",{detail:{loot}}));
    this.toast(loot==="NOTHING USEFUL"?loot:"FOUND · "+loot);
  }

  private farthestOpenCell(grid:boolean[][],sx:number,sy:number):{x:number;y:number} {
    const queue:Array<{x:number;y:number;distance:number}>=[{x:sx,y:sy,distance:0}];
    const seen=new Set([[sx,sy].join(",")]); let farthest=queue[0]!;
    while(queue.length){const current=queue.shift()!;if(current.distance>farthest.distance)farthest=current;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const){const nx=current.x+dx,ny=current.y+dy,key=[nx,ny].join(",");if(nx<0||ny<0||nx>=COLS||ny>=ROWS||grid[ny]![nx]||seen.has(key))continue;seen.add(key);queue.push({x:nx,y:ny,distance:current.distance+1});}}
    return{x:farthest.x,y:farthest.y};
  }

  private spawnEnemy(cellX:number,cellY:number):void {
    const roll=Math.random(); const kind:EnemyKind=roll<0.48?"spider":roll<0.96?"rat":"lurker";
    const x=this.tunnelOrigin.x+cellX*CELL+CELL/2,y=this.tunnelOrigin.y+cellY*CELL+CELL/2,key="tunnel-"+kind;
    if(!this.textures.exists(key)){
      const g=this.make.graphics({x:0,y:0,add:false});
      if(kind==="lurker"){g.fillStyle(0x5a625d,1).fillRect(11,4,14,24);g.fillCircle(18,4,7);g.lineStyle(3,0x333936).lineBetween(12,24,7,31).lineBetween(24,24,29,31);}
      else {g.fillStyle(kind==="spider"?0x17110f:0x6f6258,1).fillEllipse(16,16,kind==="spider"?18:25,kind==="spider"?13:12);if(kind==="spider"){g.lineStyle(2,0x2b211d,1);for(const side of[-1,1])for(const off of[-6,-2,2,6])g.lineBetween(16+side*6,16+off,16+side*14,16+off*1.6);}else{g.fillTriangle(4,13,10,8,11,16);g.lineStyle(2,0x9a8271,1).lineBetween(28,17,35,13);}}
      g.generateTexture(key,36,34);g.destroy();
    }
    const sprite=this.physics.add.sprite(x,y,key).setDepth(9);sprite.setCollideWorldBounds(false);
    (sprite.body as Phaser.Physics.Arcade.Body).setSize(24,18).setOffset(6,8);
    const collider=this.tunnelWalls?this.physics.add.collider(sprite,this.tunnelWalls):undefined;
    this.enemies.push({sprite,kind,health:kind==="spider"?1:kind==="rat"?2:3,nextTurnAt:0,collider});
  }

  private updateEnemies(time:number,_delta:number):void {
    for(const enemy of this.enemies){if(!enemy.sprite.active)continue;if(time>=enemy.nextTurnAt){enemy.nextTurnAt=time+Phaser.Math.Between(550,1450);const angle=Phaser.Math.FloatBetween(0,Math.PI*2);const speed=enemy.kind==="lurker"?18:enemy.kind==="rat"?42:30;enemy.sprite.setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed);}}
  }

  private checkEnemyContact(time:number,player:Phaser.Physics.Arcade.Sprite):void {
    if(time<this.nextContactDamageAt)return;
    const hit=this.enemies.find((enemy)=>enemy.sprite.active&&Phaser.Math.Distance.Between(player.x,player.y,enemy.sprite.x,enemy.sprite.y)<34);
    if(!hit)return;
    this.nextContactDamageAt=time+900;
    const runtime=this.runtime(); runtime.health=Phaser.Math.Clamp(runtime.health-ENEMY_DAMAGE,0,100); runtime.emitState();
    player.setTintFill(0xffffff); this.time.delayedCall(90,()=>player.clearTint()); this.time.delayedCall(180,()=>player.setAlpha(0.25)); this.time.delayedCall(270,()=>player.setAlpha(1));
    const away=new Phaser.Math.Vector2(player.x-hit.sprite.x,player.y-hit.sprite.y).normalize().scale(100);hit.sprite.setVelocity(-away.x,-away.y);
    this.toast(hit.kind.toUpperCase()+" ATTACK · -"+String(ENEMY_DAMAGE)+" HEALTH");
    if(runtime.health<=0)this.showDeath();
  }

  private readonly onGunshot=():void=>{
    if(!this.inTunnels||!this.player)return;const origin=new Phaser.Math.Vector2(this.player.x,this.player.y),direction=this.lastFacing.clone().normalize();let best:EnemyState|undefined,bestDistance=Infinity;
    for(const enemy of this.enemies){if(!enemy.sprite.active)continue;const offset=new Phaser.Math.Vector2(enemy.sprite.x-origin.x,enemy.sprite.y-origin.y),forward=offset.dot(direction);if(forward<=0||forward>700)continue;const lateral=Math.abs(offset.x*direction.y-offset.y*direction.x);if(lateral<=18&&forward<bestDistance){best=enemy;bestDistance=forward;}}
    if(best)this.damageEnemy(best,best.kind==="lurker"?2:99);
  };
  private readonly onTouchAttack=():void=>{if(this.inTunnels)window.setTimeout(()=>this.tryStab(),0);};
  private tryStab():void {
    if(!this.inTunnels||!this.player)return;const origin=new Phaser.Math.Vector2(this.player.x,this.player.y),direction=this.lastFacing.clone().normalize();
    const target=this.enemies.filter((enemy)=>enemy.sprite.active).map((enemy)=>({enemy,offset:new Phaser.Math.Vector2(enemy.sprite.x-origin.x,enemy.sprite.y-origin.y)})).filter(({offset})=>offset.length()<=58&&offset.dot(direction)>0).sort((a,b)=>a.offset.lengthSq()-b.offset.lengthSq())[0]?.enemy;
    if(target)this.damageEnemy(target,target.kind==="spider"?99:1);
  }
  private damageEnemy(enemy:EnemyState,amount:number):void {enemy.health-=amount;enemy.sprite.setTintFill(0xffffff);this.time.delayedCall(90,()=>enemy.sprite.clearTint());if(enemy.health>0)return;enemy.collider?.destroy();enemy.sprite.disableBody(true,true);this.toast(enemy.kind.toUpperCase()+" KILLED");}

  private toggleInventory():void {
    const overlay=document.querySelector<HTMLElement>(".game-overlay");
    if(this.runtime().uiOpen&&overlay?.classList.contains("is-open")){overlay.classList.remove("is-open");overlay.replaceChildren();this.runtime().uiOpen=false;return;}
    this.runtime().openBackpack?.();
  }

  private togglePauseMenu():void {
    const overlay=document.querySelector<HTMLElement>(".game-overlay"); if(!overlay)return;
    if(this.pausedByMenu){this.closePauseMenu();return;}
    this.pausedByMenu=true;this.runtime().uiOpen=true;this.physics.world.pause();overlay.classList.add("is-open");
    const panel=document.createElement("div");panel.className="message-panel pause-panel";panel.innerHTML="<h2>PAUSED</h2><button class='resume-game'>RESUME</button><button class='restart-game'>RESTART</button>";
    panel.querySelector(".resume-game")?.addEventListener("click",()=>this.closePauseMenu());
    panel.querySelector(".restart-game")?.addEventListener("click",()=>window.location.reload());
    overlay.replaceChildren(panel);
  }
  private closePauseMenu():void {const overlay=document.querySelector<HTMLElement>(".game-overlay");this.pausedByMenu=false;this.runtime().uiOpen=false;this.physics.world.resume();overlay?.classList.remove("is-open");overlay?.replaceChildren();}

  private showDeath():void {const overlay=document.querySelector<HTMLElement>(".game-overlay");if(!overlay)return;this.pausedByMenu=true;this.runtime().uiOpen=true;this.physics.world.pause();overlay.classList.add("is-open");const panel=document.createElement("div");panel.className="message-panel death-panel";panel.innerHTML="<h2>YOU DIED</h2><p>The tunnels keep what they take.</p><button>RESTART</button>";panel.querySelector("button")?.addEventListener("click",()=>window.location.reload());overlay.replaceChildren(panel);}

  private completeDemo():void {const overlay=document.querySelector<HTMLElement>(".game-overlay");if(!overlay)return;this.runtime().uiOpen=true;overlay.classList.add("is-open");const panel=document.createElement("div");panel.className="message-panel demo-complete";panel.innerHTML="<h2>DEMO COMPLETE</h2><p>You found the ladder out.</p><button>RETURN TO BUNKER</button>";panel.querySelector("button")?.addEventListener("click",()=>{overlay.classList.remove("is-open");overlay.replaceChildren();this.runtime().uiOpen=false;this.leaveTunnels();});overlay.replaceChildren(panel);}

  private leaveTunnels():void {const player=this.player;if(!player||this.tunnelTransitioning)return;this.tunnelTransitioning=true;const camera=this.cameras.main;camera.fadeOut(450,0,0,0);camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>{this.inTunnels=false;this.destroyTunnel();if(this.bunkerBounds)this.physics.world.setBounds(this.bunkerBounds.x,this.bunkerBounds.y,this.bunkerBounds.width,this.bunkerBounds.height);player.setPosition(this.entranceDoor.x,this.entranceDoor.y-90);(player.body as Phaser.Physics.Arcade.Body).setVelocity(0,0);camera.stopFollow();camera.startFollow(player,true,0.12,0.12);camera.fadeIn(450,0,0,0);camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,()=>{this.tunnelTransitioning=false;});});}

  private destroyTunnel():void {this.tunnelCollider?.destroy();this.tunnelCollider=undefined;for(const enemy of this.enemies){enemy.collider?.destroy();enemy.sprite.destroy();}this.enemies=[];this.rooms=[];this.searchables=[];this.tunnelWalls?.clear(true,true);this.tunnelWalls=undefined;this.tunnelRoot?.destroy(true);this.tunnelRoot=undefined;this.exitMarker=undefined;this.exitPrompt=undefined;this.searchPrompt=undefined;}

  private toast(message:string):void {window.dispatchEvent(new CustomEvent("bunker-toast",{detail:{message}}));const toast=document.createElement("div");toast.className="inventory-toast survival-toast";toast.textContent=message;document.querySelector("#app")?.append(toast);window.setTimeout(()=>toast.remove(),1700);}
}
`;

await writeFile(scenePath, scene, "utf8");

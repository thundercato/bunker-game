import Phaser from "phaser";

const TILE = 32;
const WALK_SPEED = 63;
const RUN_SPEED = 142.5;
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1088;
const STAMINA_DRAIN_PER_SECOND = 20;
const STAMINA_REFILL_PER_SECOND = 4;

type Direction = "down" | "up" | "left" | "right";
type Interaction = "bunk" | "storage" | "weapons";
type ItemId = "cigarettes" | "jerky";
type StoredItem = {
  id: ItemId;
  name: string;
  description: string;
  details: string;
  stats: string[];
  slot: number;
  taken: boolean;
};

type Zone = {
  name: string;
  rect: Phaser.Geom.Rectangle;
  framed: boolean;
};

const ZONES: Zone[] = [
  { name: "LIVING QUARTERS", rect: new Phaser.Geom.Rectangle(64, 96, 576, 448), framed: true },
  { name: "CENTRAL CORRIDOR", rect: new Phaser.Geom.Rectangle(640, 224, 576, 192), framed: false },
  { name: "TRAINING ROOM", rect: new Phaser.Geom.Rectangle(1216, 96, 640, 480), framed: true },
  { name: "LOWER PASSAGE", rect: new Phaser.Geom.Rectangle(800, 416, 288, 576), framed: false },
];

export class BunkerV6Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private props!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private promptLabel!: Phaser.GameObjects.Text;
  private gate!: Phaser.GameObjects.Container;
  private direction: Direction = "down";
  private frame = 0;
  private animationClock = 0;
  private gameMinutes = 8 * 60;
  private minuteClock = 0;
  private cameraFollowing = true;
  private entered = false;
  private interactionHeld = false;
  private closeHeld = false;
  private uiOpen = false;
  private stamina = 100;
  private readonly health = 100;
  private readonly hunger = 82;
  private readonly thirst = 74;
  private readonly items: StoredItem[] = [
    {
      id: "cigarettes",
      name: "PACKET OF CIGARETTES",
      description: "A crushed military-green packet with six cigarettes left.",
      details: "The paper is dry and the tobacco still smells usable. A small comfort from the old world, with a price attached.",
      stats: ["Quantity: 6", "Stress: -8", "Health: -2", "Weight: 0.1 kg"],
      slot: 1,
      taken: false,
    },
    {
      id: "jerky",
      name: "BEEF JERKY",
      description: "Salted beef strips sealed in cloudy plastic.",
      details: "A compact ration with enough protein to take the edge off hunger. The packet is intact and aggressively preserved.",
      stats: ["Hunger: +18", "Thirst: -2", "Weight: 0.2 kg", "Condition: Sealed"],
      slot: 3,
      taken: false,
    },
  ];

  public constructor() {
    super("ScrollingBunkerV3");
  }

  public create(): void {
    this.makeArt();
    this.walls = this.physics.add.staticGroup();
    this.props = this.physics.add.staticGroup();
    this.player = this.physics.add.sprite(11 * TILE, 12 * TILE, "survivor-down-0").setDepth(20).setScale(1, 2);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 24).setOffset(7, 36);

    this.buildMap();
    this.makePrompt();
    this.makeGate();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard unavailable");
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D,E,SPACE,ESC,SHIFT") as Record<string, Phaser.Input.Keyboard.Key>;

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.props);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.player.setCollideWorldBounds(true);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).setZoom(1.4);
    camera.startFollow(this.player, true, 0.08, 0.08);
    camera.roundPixels = true;

    window.addEventListener("bunker-storage-close", this.onStorageClose);
    window.addEventListener("bunker-take-item", this.onTakeItem as EventListener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("bunker-storage-close", this.onStorageClose);
      window.removeEventListener("bunker-take-item", this.onTakeItem as EventListener);
    });
    this.emitState();
  }

  public update(_time: number, delta: number): void {
    this.advanceClock(delta);
    this.handleCloseInput();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!this.entered || this.uiOpen) {
      body.setVelocity(0, 0);
      this.animate(new Phaser.Math.Vector2(), delta, false);
      return;
    }

    const move = this.movement();
    const moving = move.lengthSq() > 0.05;
    const running = moving && this.runPressed() && this.stamina > 0;
    const speed = running ? RUN_SPEED : WALK_SPEED;
    body.setVelocity(move.x * speed, move.y * speed);
    if (move.lengthSq() > 1) body.velocity.normalize().scale(speed);

    this.updateStamina(running, delta);
    this.animate(move, delta, running);
    this.cameraLogic();
    this.handleInteraction();
  }

  private readonly onStorageClose = (): void => {
    this.uiOpen = false;
  };

  private readonly onTakeItem = (event: CustomEvent<{ id: ItemId }>): void => {
    const item = this.items.find((candidate) => candidate.id === event.detail.id);
    if (item) item.taken = true;
    this.emitStorage();
  };

  private emitState(): void {
    window.dispatchEvent(new CustomEvent("bunker-state", {
      detail: {
        time: this.formatTime(),
        health: this.health,
        hunger: this.hunger,
        thirst: this.thirst,
        stamina: Math.round(this.stamina),
      },
    }));
  }

  private emitStorage(): void {
    window.dispatchEvent(new CustomEvent("bunker-storage-open", {
      detail: { items: this.items.map((item) => ({ ...item })) },
    }));
  }

  private makeArt(): void {
    const tile = (key: string, base: number, top: number, draw: (graphics: Phaser.GameObjects.Graphics) => void): void => {
      const graphics = this.add.graphics();
      graphics.fillStyle(base).fillRect(0, 0, TILE, TILE);
      graphics.fillStyle(top, 0.65).fillRect(1, 1, 30, 2);
      graphics.fillStyle(0x000000, 0.25).fillRect(0, 29, 32, 3);
      draw(graphics);
      graphics.generateTexture(key, TILE, TILE);
      graphics.destroy();
    };
    tile("concrete-v6", 0x30363a, 0x555c60, (g) => { g.fillStyle(0x1d2225).fillRect(5, 9, 2, 2); g.fillRect(23, 22, 3, 2); });
    tile("cracked-v6", 0x292f33, 0x484f53, (g) => { g.lineStyle(1, 0x111518).lineBetween(5, 4, 14, 15); g.lineBetween(14, 15, 9, 27); g.lineBetween(14, 15, 27, 20); });
    tile("metal-v6", 0x273139, 0x596772, (g) => { g.lineStyle(1, 0x13191d).strokeRect(4, 4, 24, 24); });
    tile("grate-v6", 0x1c2429, 0x47555d, (g) => { g.lineStyle(2, 0x0b1013); for (let x = 4; x < 32; x += 6) g.lineBetween(x, 3, x, 29); });
    tile("wall-v6", 0x172027, 0x40505a, (g) => { g.fillStyle(0x090d10).fillRect(0, 22, 32, 10); g.lineStyle(2, 0x66737b).lineBetween(0, 21, 32, 21); });
    tile("hazard-v6", 0x20272c, 0x4e5a62, (g) => { for (let x = -10; x < 42; x += 12) g.fillStyle(0xcfa72d).fillTriangle(x, 22, x + 8, 22, x + 16, 32); });
    tile("crate-v6", 0x5b4128, 0x946f43, (g) => { g.lineStyle(3, 0x2a1b10).strokeRect(2, 2, 28, 28); g.lineBetween(4, 4, 28, 28); g.lineBetween(28, 4, 4, 28); });

    for (const direction of ["down", "up", "left", "right"] as const) {
      for (let frame = 0; frame < 2; frame += 1) {
        const g = this.add.graphics();
        g.fillStyle(0x050709, 0.42).fillEllipse(16, 30, 22, 6);
        g.fillStyle(0x252b2f).fillCircle(16, 8, 6);
        g.fillStyle(0x405f47).fillRoundedRect(9, 13, 14, 14, 3);
        g.fillStyle(0x1b2125).fillRect(10, 26, 5, frame === 0 ? 6 : 4);
        g.fillRect(17, 26, 5, frame === 0 ? 4 : 6);
        const eyeX = direction === "left" ? 11 : direction === "right" ? 19 : 15;
        const eyeY = direction === "up" ? 5 : 9;
        g.fillStyle(0xd8c79e).fillRect(eyeX, eyeY, 2, 2);
        g.generateTexture(`survivor-${direction}-${frame}`, 32, 32);
        g.destroy();
      }
    }
  }

  private buildMap(): void {
    for (let tileY = 0; tileY < 34; tileY += 1) {
      for (let tileX = 0; tileX < 60; tileX += 1) {
        if (!this.inZone(tileX, tileY)) continue;
        const x = tileX * TILE + 16;
        const y = tileY * TILE + 16;
        if (this.isWall(tileX, tileY)) {
          const wall = this.walls.create(x, y, (tileX + tileY) % 10 === 0 ? "hazard-v6" : "wall-v6") as Phaser.Physics.Arcade.Image;
          wall.refreshBody();
        } else {
          let key = (tileX + tileY) % 12 === 0 ? "cracked-v6" : "concrete-v6";
          if (tileX >= 20 && tileX < 38) key = tileY % 3 === 0 ? "grate-v6" : "metal-v6";
          this.add.image(x, y, key);
        }
      }
    }
    for (const [tileX, tileY] of [[6, 7], [7, 7], [15, 13], [44, 6], [53, 14], [29, 25], [30, 25]] as Array<[number, number]>) {
      const prop = this.props.create(tileX * TILE + 16, tileY * TILE + 16, "crate-v6") as Phaser.Physics.Arcade.Image;
      prop.refreshBody();
    }
    this.furniture();
  }

  private inZone(tileX: number, tileY: number): boolean {
    return ZONES.some((zone) => zone.rect.contains(tileX * TILE + 1, tileY * TILE + 1));
  }

  private isWall(tileX: number, tileY: number): boolean {
    const x = tileX * TILE + 1;
    const y = tileY * TILE + 1;
    for (const zone of ZONES) {
      if (!zone.rect.contains(x, y)) continue;
      const localX = x - zone.rect.x;
      const localY = y - zone.rect.y;
      const edge = localX < TILE || localY < TILE || localX >= zone.rect.width - TILE || localY >= zone.rect.height - TILE;
      if (!edge) return false;
      const open =
        (zone.name === "LIVING QUARTERS" && localX >= zone.rect.width - TILE && localY >= 5 * TILE && localY <= 8 * TILE) ||
        (zone.name === "CENTRAL CORRIDOR" && ((localX < TILE && localY >= TILE && localY <= 4 * TILE) || (localX >= zone.rect.width - TILE && localY >= TILE && localY <= 4 * TILE) || (localY >= zone.rect.height - TILE && localX >= 4 * TILE && localX <= 12 * TILE))) ||
        (zone.name === "TRAINING ROOM" && localX < TILE && localY >= 5 * TILE && localY <= 8 * TILE) ||
        (zone.name === "LOWER PASSAGE" && localY < TILE && localX >= 2 * TILE && localX <= 6 * TILE);
      return !open;
    }
    return false;
  }

  private furniture(): void {
    const label = (x: number, y: number, text: string): void => {
      this.add.text(x, y, text, { fontFamily: "monospace", fontSize: "11px", color: "#aab4b9", backgroundColor: "#080c0fdd", padding: { x: 5, y: 3 } }).setOrigin(0.5).setDepth(5);
    };
    this.add.rectangle(7 * TILE, 9 * TILE, 5 * TILE, 2.5 * TILE, 0x324a36).setStrokeStyle(5, 0x5a3926).setDepth(4);
    label(7 * TILE, 10.7 * TILE, "BUNK");
    this.add.rectangle(16 * TILE, 8 * TILE, 5 * TILE, 2 * TILE, 0x594027).setStrokeStyle(4, 0x25180f).setDepth(4);
    label(16 * TILE, 9.4 * TILE, "WEAPON STATION");
    this.add.rectangle(7 * TILE, 14 * TILE, 4 * TILE, 1.5 * TILE, 0x304833).setStrokeStyle(4, 0x142018).setDepth(4);
    label(7 * TILE, 15.1 * TILE, "STORAGE");
  }

  private makePrompt(): void {
    this.promptLabel = this.add.text(640, 650, "", { fontFamily: "monospace", fontSize: "16px", color: "#f5e6b4", backgroundColor: "#05080bee", padding: { x: 14, y: 8 } }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);
  }

  private makeGate(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.84).setScrollFactor(0);
    const button = this.add.rectangle(640, 360, 430, 126, 0x17351e).setScrollFactor(0).setStrokeStyle(3, 0x59dd72);
    const title = this.add.text(640, 330, "BUNKER v0.5.10", { fontFamily: "monospace", fontSize: "30px", color: "#6ff087", fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0);
    const sub = this.add.text(640, 382, "TAP TO ENTER", { fontFamily: "monospace", fontSize: "18px", color: "#d9e4dc" }).setOrigin(0.5).setScrollFactor(0);
    this.gate = this.add.container(0, 0, [shade, button, title, sub]).setDepth(220);
    button.setInteractive({ useHandCursor: true }).on("pointerdown", () => { navigator.getGamepads(); this.entered = true; this.gate.destroy(); });
  }

  private movement(): Phaser.Math.Vector2 {
    const pad = this.gamepad();
    const key = (name: string): boolean => this.keys[name].isDown;
    const keyboardX = (this.cursors.left.isDown ? -1 : 0) + (this.cursors.right.isDown ? 1 : 0) + (key("A") ? -1 : 0) + (key("D") ? 1 : 0);
    const keyboardY = (this.cursors.up.isDown ? -1 : 0) + (this.cursors.down.isDown ? 1 : 0) + (key("W") ? -1 : 0) + (key("S") ? 1 : 0);
    const padX = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? (pad?.axes[0] ?? 0) : 0;
    const padY = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? (pad?.axes[1] ?? 0) : 0;
    return new Phaser.Math.Vector2(padX || keyboardX, padY || keyboardY).limit(1);
  }

  private runPressed(): boolean {
    return (this.gamepad()?.buttons[10]?.pressed ?? false) || this.keys.SHIFT.isDown;
  }

  private updateStamina(running: boolean, delta: number): void {
    const seconds = delta / 1000;
    this.stamina = running ? Math.max(0, this.stamina - STAMINA_DRAIN_PER_SECOND * seconds) : Math.min(100, this.stamina + STAMINA_REFILL_PER_SECOND * seconds);
    this.emitState();
  }

  private animate(move: Phaser.Math.Vector2, delta: number, running: boolean): void {
    if (move.lengthSq() > 0.05) {
      if (Math.abs(move.x) > Math.abs(move.y)) this.direction = move.x < 0 ? "left" : "right";
      else this.direction = move.y < 0 ? "up" : "down";
      this.animationClock += delta;
      const frameDelay = running ? 100 : 280;
      if (this.animationClock > frameDelay) { this.frame = this.frame === 0 ? 1 : 0; this.animationClock = 0; }
    } else { this.frame = 0; this.animationClock = 0; }
    this.player.setTexture(`survivor-${this.direction}-${this.frame}`);
  }

  private cameraLogic(): void {
    const zone = ZONES.find((candidate) => candidate.rect.contains(this.player.x, this.player.y));
    if (!zone) return;
    const camera = this.cameras.main;
    if (zone.framed) {
      if (this.cameraFollowing) { camera.stopFollow(); this.cameraFollowing = false; }
      const targetZoom = Math.min((camera.width - 70) / zone.rect.width, (camera.height - 70) / zone.rect.height);
      camera.zoom = Phaser.Math.Linear(camera.zoom, targetZoom, 0.08);
      camera.scrollX = Phaser.Math.Linear(camera.scrollX, zone.rect.centerX - camera.width / (2 * camera.zoom), 0.08);
      camera.scrollY = Phaser.Math.Linear(camera.scrollY, zone.rect.centerY - camera.height / (2 * camera.zoom), 0.08);
    } else {
      camera.zoom = Phaser.Math.Linear(camera.zoom, 1.4, 0.08);
      if (!this.cameraFollowing) { camera.startFollow(this.player, true, 0.08, 0.08); this.cameraFollowing = true; }
    }
  }

  private handleInteraction(): void {
    const pressed = this.keys.E.isDown || this.keys.SPACE.isDown || (this.gamepad()?.buttons[0]?.pressed ?? false);
    if (pressed && !this.interactionHeld) this.tryInteract();
    this.interactionHeld = pressed;
    const nearby = this.nearbyInteraction();
    if (!nearby) { this.promptLabel.setVisible(false); return; }
    const names: Record<Interaction, string> = { bunk: "BUNK", storage: "STORAGE TRUNK", weapons: "WEAPON STATION" };
    this.promptLabel.setText(`USE / A  ${names[nearby]}`).setVisible(true);
  }

  private tryInteract(): void {
    if (!this.entered || this.uiOpen) return;
    const interaction = this.nearbyInteraction();
    if (interaction === "storage") { this.uiOpen = true; this.promptLabel.setVisible(false); this.emitStorage(); }
    if (interaction === "bunk") window.dispatchEvent(new CustomEvent("bunker-message", { detail: { title: "YOUR BUNK", text: "A narrow military cot under cold concrete." } }));
    if (interaction === "weapons") window.dispatchEvent(new CustomEvent("bunker-message", { detail: { title: "WEAPON-CLEANING TABLE", text: "No weapons. Only bore brushes, cotton patches, gun oil and old cleaning rods." } }));
  }

  private nearbyInteraction(): Interaction | null {
    const points = [
      { type: "bunk" as const, x: 7 * TILE, y: 9 * TILE, range: 120 },
      { type: "storage" as const, x: 7 * TILE, y: 14 * TILE, range: 105 },
      { type: "weapons" as const, x: 16 * TILE, y: 8 * TILE, range: 115 },
    ];
    return points.find((point) => Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) < point.range)?.type ?? null;
  }

  private handleCloseInput(): void {
    const pressed = (this.gamepad()?.buttons[1]?.pressed ?? false) || this.keys?.ESC?.isDown === true;
    if (pressed && !this.closeHeld && this.uiOpen) window.dispatchEvent(new Event("bunker-storage-close-request"));
    this.closeHeld = pressed;
  }

  private advanceClock(delta: number): void {
    this.minuteClock += delta;
    if (this.minuteClock < 60000) return;
    const minutes = Math.floor(this.minuteClock / 60000);
    this.minuteClock %= 60000;
    this.gameMinutes = (this.gameMinutes + minutes) % (24 * 60);
    this.emitState();
  }

  private formatTime(): string {
    const hours = Math.floor(this.gameMinutes / 60).toString().padStart(2, "0");
    const minutes = (this.gameMinutes % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  private gamepad(): Gamepad | null {
    return Array.from(navigator.getGamepads()).find((pad): pad is Gamepad => pad !== null) ?? null;
  }
}

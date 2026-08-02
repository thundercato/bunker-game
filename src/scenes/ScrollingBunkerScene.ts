import Phaser from "phaser";

const TILE = 32;
const VERSION = "0.3.00";
const WORLD_W = 60;
const WORLD_H = 34;
const SPEED = 190;

type Zone = {
  name: string;
  rect: Phaser.Geom.Rectangle;
  framed: boolean;
};

const ZONES: Zone[] = [
  { name: "LIVING QUARTERS", rect: new Phaser.Geom.Rectangle(2 * TILE, 3 * TILE, 18 * TILE, 14 * TILE), framed: true },
  { name: "CENTRAL CORRIDOR", rect: new Phaser.Geom.Rectangle(20 * TILE, 7 * TILE, 18 * TILE, 6 * TILE), framed: false },
  { name: "TRAINING ROOM", rect: new Phaser.Geom.Rectangle(38 * TILE, 3 * TILE, 20 * TILE, 15 * TILE), framed: true },
  { name: "LOWER PASSAGE", rect: new Phaser.Geom.Rectangle(25 * TILE, 13 * TILE, 9 * TILE, 18 * TILE), framed: false },
];

export class ScrollingBunkerScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private props!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private roomLabel!: Phaser.GameObjects.Text;
  private activation!: Phaser.GameObjects.Container;
  private roomName = "";
  private direction: "down" | "up" | "left" | "right" = "down";
  private frame = 0;
  private frameClock = 0;

  public constructor() {
    super("ScrollingBunker");
  }

  public create(): void {
    this.makeTextures();
    this.walls = this.physics.add.staticGroup();
    this.props = this.physics.add.staticGroup();
    this.createPlayer();
    this.buildWorld();
    this.createHud();
    this.createActivationGate();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard unavailable");
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.props);
    this.physics.world.setBounds(0, 0, WORLD_W * TILE, WORLD_H * TILE);
    this.player.setCollideWorldBounds(true);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_W * TILE, WORLD_H * TILE);
    camera.startFollow(this.player, true, 0.08, 0.08);
    camera.setZoom(1.4);
    camera.roundPixels = true;
  }

  public update(_time: number, delta: number): void {
    const move = this.readMovement();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(move.x * SPEED, move.y * SPEED);
    if (move.lengthSq() > 1) body.velocity.normalize().scale(SPEED);
    this.animatePlayer(move, delta);
    this.updateCamera();
  }

  private makeTextures(): void {
    const tile = (key: string, base: number, top: number, detail: (g: Phaser.GameObjects.Graphics) => void): void => {
      const g = this.add.graphics();
      g.fillStyle(base).fillRect(0, 0, TILE, TILE);
      g.fillStyle(top, 0.65).fillRect(1, 1, 30, 2);
      g.fillStyle(0x000000, 0.24).fillRect(0, 29, 32, 3);
      detail(g);
      g.generateTexture(key, TILE, TILE);
      g.destroy();
    };

    tile("concrete", 0x30363a, 0x545b5f, (g) => {
      g.fillStyle(0x1d2225).fillRect(5, 9, 2, 2);
      g.fillRect(23, 22, 3, 2);
      g.fillStyle(0x777d80, 0.25).fillRect(15, 5, 1, 9);
    });
    tile("cracked", 0x2a3034, 0x4a5155, (g) => {
      g.lineStyle(1, 0x121619).lineBetween(5, 4, 14, 15);
      g.lineBetween(14, 15, 9, 27);
      g.lineBetween(14, 15, 27, 20);
    });
    tile("metal", 0x273139, 0x596772, (g) => {
      g.lineStyle(1, 0x13191d).strokeRect(4, 4, 24, 24);
      for (const [x, y] of [[6, 6], [26, 6], [6, 26], [26, 26]] as Array<[number, number]>) g.fillStyle(0x9d7942).fillCircle(x, y, 1);
    });
    tile("grate", 0x1c2429, 0x47555d, (g) => {
      g.lineStyle(2, 0x0b1013);
      for (let x = 4; x < 32; x += 6) g.lineBetween(x, 3, x, 29);
      for (let y = 5; y < 32; y += 7) g.lineBetween(3, y, 29, y);
    });
    tile("wall", 0x172027, 0x40505a, (g) => {
      g.fillStyle(0x090d10).fillRect(0, 22, 32, 10);
      g.lineStyle(2, 0x66737b).lineBetween(0, 21, 32, 21);
      g.fillStyle(0x925c31).fillRect(4, 5, 3, 3);
      g.fillRect(25, 13, 2, 3);
    });
    tile("hazard", 0x20272c, 0x4e5a62, (g) => {
      for (let x = -10; x < 42; x += 12) g.fillStyle(0xcfa72d).fillTriangle(x, 22, x + 8, 22, x + 16, 32);
    });
    tile("crate", 0x5b4128, 0x946f43, (g) => {
      g.lineStyle(3, 0x2a1b10).strokeRect(2, 2, 28, 28);
      g.lineBetween(4, 4, 28, 28);
      g.lineBetween(28, 4, 4, 28);
    });

    for (const direction of ["down", "up", "left", "right"] as const) {
      for (let frame = 0; frame < 2; frame += 1) {
        const g = this.add.graphics();
        g.fillStyle(0x050709, 0.42).fillEllipse(16, 28, 22, 7);
        g.fillStyle(0x20282d).fillCircle(16, 8, 6);
        g.fillStyle(0x3e5c44).fillRoundedRect(9, 12, 14, 12, 3);
        g.fillStyle(0x1a2024).fillRect(10, 23, 5, frame === 0 ? 7 : 5);
        g.fillRect(17, 23, 5, frame === 0 ? 5 : 7);
        const faceX = direction === "left" ? 11 : direction === "right" ? 19 : 15;
        const faceY = direction === "up" ? 5 : 9;
        g.fillStyle(0xd8c79e).fillRect(faceX, faceY, 2, 2);
        g.generateTexture(`survivor-${direction}-${frame}`, 32, 32);
        g.destroy();
      }
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(11 * TILE, 12 * TILE, "survivor-down-0");
    this.player.setDepth(20);
    this.player.body.setSize(18, 20).setOffset(7, 10);
  }

  private buildWorld(): void {
    for (let ty = 0; ty < WORLD_H; ty += 1) {
      for (let tx = 0; tx < WORLD_W; tx += 1) {
        if (!this.tileBelongsToZone(tx, ty)) continue;
        const x = tx * TILE + 16;
        const y = ty * TILE + 16;
        if (this.isWall(tx, ty)) {
          const texture = (tx + ty) % 10 === 0 ? "hazard" : "wall";
          const wall = this.walls.create(x, y, texture) as Phaser.Physics.Arcade.Image;
          wall.refreshBody();
        } else {
          let texture = (tx + ty) % 12 === 0 ? "cracked" : "concrete";
          if (tx >= 20 && tx < 38) texture = ty % 3 === 0 ? "grate" : "metal";
          this.add.image(x, y, texture).setDepth(0);
        }
      }
    }

    for (const [tx, ty] of [[6, 7], [7, 7], [15, 13], [44, 6], [53, 14], [29, 25], [30, 25]] as Array<[number, number]>) {
      const prop = this.props.create(tx * TILE + 16, ty * TILE + 16, "crate") as Phaser.Physics.Arcade.Image;
      prop.refreshBody();
    }

    this.addFurniture();
  }

  private tileBelongsToZone(tx: number, ty: number): boolean {
    const x = tx * TILE + 1;
    const y = ty * TILE + 1;
    return ZONES.some((zone) => zone.rect.contains(x, y));
  }

  private isWall(tx: number, ty: number): boolean {
    const x = tx * TILE + 1;
    const y = ty * TILE + 1;
    for (const zone of ZONES) {
      if (!zone.rect.contains(x, y)) continue;
      const lx = x - zone.rect.x;
      const ly = y - zone.rect.y;
      const edge = lx < TILE || ly < TILE || lx >= zone.rect.width - TILE || ly >= zone.rect.height - TILE;
      if (!edge) return false;

      const opening =
        (zone.name === "LIVING QUARTERS" && lx >= zone.rect.width - TILE && ly >= 5 * TILE && ly <= 8 * TILE) ||
        (zone.name === "CENTRAL CORRIDOR" && ((lx < TILE && ly >= TILE && ly <= 4 * TILE) || (lx >= zone.rect.width - TILE && ly >= TILE && ly <= 4 * TILE) || (ly >= zone.rect.height - TILE && lx >= 4 * TILE && lx <= 12 * TILE))) ||
        (zone.name === "TRAINING ROOM" && lx < TILE && ly >= 5 * TILE && ly <= 8 * TILE) ||
        (zone.name === "LOWER PASSAGE" && ly < TILE && lx >= 2 * TILE && lx <= 6 * TILE);
      return !opening;
    }
    return false;
  }

  private addFurniture(): void {
    const label = (x: number, y: number, text: string): void => {
      this.add.text(x, y, text, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#aab4b9",
        backgroundColor: "#080c0fdd",
        padding: { x: 5, y: 3 },
      }).setOrigin(0.5).setDepth(5);
    };

    const bed = this.add.rectangle(7 * TILE, 9 * TILE, 5 * TILE, 2.5 * TILE, 0x324a36).setDepth(4);
    bed.setStrokeStyle(5, 0x5a3926);
    this.add.rectangle(5.4 * TILE, 8.5 * TILE, 1.3 * TILE, 1.1 * TILE, 0xb2a797).setDepth(5);
    label(7 * TILE, 10.7 * TILE, "BUNK");

    const bench = this.add.rectangle(16 * TILE, 8 * TILE, 5 * TILE, 2 * TILE, 0x594027).setDepth(4);
    bench.setStrokeStyle(4, 0x25180f);
    label(16 * TILE, 9.4 * TILE, "WEAPON STATION");

    const chest = this.add.rectangle(7 * TILE, 14 * TILE, 4 * TILE, 1.5 * TILE, 0x304833).setDepth(4);
    chest.setStrokeStyle(4, 0x142018);
    label(7 * TILE, 15.1 * TILE, "STORAGE");

    for (const tx of [43, 48, 53, 57]) {
      this.add.rectangle(tx * TILE, 11 * TILE, 34, 72, 0x79502f).setStrokeStyle(3, 0x2b190e).setDepth(4);
      this.add.circle(tx * TILE, 9.7 * TILE, 11, 0xa46f3d).setStrokeStyle(3, 0x2b190e).setDepth(5);
    }
  }

  private createHud(): void {
    this.roomLabel = this.add.text(18, 18, "", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#65e27c",
      backgroundColor: "#05080be8",
      padding: { x: 12, y: 8 },
    }).setScrollFactor(0).setDepth(100);

    this.add.text(1260, 700, `v${VERSION}`, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#829099",
      backgroundColor: "#05080bd0",
      padding: { x: 6, y: 3 },
    }).setOrigin(1).setScrollFactor(0).setDepth(100);
  }

  private createActivationGate(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.78).setScrollFactor(0);
    const button = this.add.rectangle(640, 360, 400, 120, 0x17351e).setScrollFactor(0);
    button.setStrokeStyle(3, 0x59dd72);
    const title = this.add.text(640, 344, "TAP TO ENTER", {
      fontFamily: "monospace", fontSize: "30px", color: "#6ff087", fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0);
    const subtitle = this.add.text(640, 390, "Tile map prototype • smooth scrolling", {
      fontFamily: "monospace", fontSize: "14px", color: "#d9e4dc",
    }).setOrigin(0.5).setScrollFactor(0);
    this.activation = this.add.container(0, 0, [shade, button, title, subtitle]).setDepth(200);
    button.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      navigator.getGamepads();
      this.activation.destroy();
    });
  }

  private readMovement(): Phaser.Math.Vector2 {
    const pad = this.getGamepad();
    const keyDown = (name: string): boolean => this.keys[name]?.isDown ?? false;
    const keyboardX = (this.cursors.left.isDown ? -1 : 0) + (this.cursors.right.isDown ? 1 : 0) + (keyDown("A") ? -1 : 0) + (keyDown("D") ? 1 : 0);
    const keyboardY = (this.cursors.up.isDown ? -1 : 0) + (this.cursors.down.isDown ? 1 : 0) + (keyDown("W") ? -1 : 0) + (keyDown("S") ? 1 : 0);
    const px = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? (pad?.axes[0] ?? 0) : 0;
    const py = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? (pad?.axes[1] ?? 0) : 0;
    return new Phaser.Math.Vector2(px || keyboardX, py || keyboardY).limit(1);
  }

  private animatePlayer(move: Phaser.Math.Vector2, delta: number): void {
    if (move.lengthSq() > 0.05) {
      if (Math.abs(move.x) > Math.abs(move.y)) this.direction = move.x < 0 ? "left" : "right";
      else this.direction = move.y < 0 ? "up" : "down";
      this.frameClock += delta;
      if (this.frameClock > 170) {
        this.frame = this.frame === 0 ? 1 : 0;
        this.frameClock = 0;
      }
    } else {
      this.frame = 0;
      this.frameClock = 0;
    }
    this.player.setTexture(`survivor-${this.direction}-${this.frame}`);
  }

  private updateCamera(): void {
    const zone = ZONES.find((item) => item.rect.contains(this.player.x, this.player.y));
    if (!zone) return;
    if (zone.name !== this.roomName) {
      this.roomName = zone.name;
      this.roomLabel.setText(`${zone.name}\n${zone.framed ? "FRAMED CAMERA" : "FREE CAMERA"}`);
    }

    const camera = this.cameras.main;
    if (zone.framed) {
      camera.stopFollow();
      const targetX = zone.rect.centerX - camera.width / (2 * camera.zoom);
      const targetY = zone.rect.centerY - camera.height / (2 * camera.zoom);
      camera.scrollX = Phaser.Math.Linear(camera.scrollX, targetX, 0.08);
      camera.scrollY = Phaser.Math.Linear(camera.scrollY, targetY, 0.08);
    } else if (!camera.followTarget) {
      camera.startFollow(this.player, true, 0.08, 0.08);
    }
  }

  private getGamepad(): Gamepad | null {
    const getter = navigator.getGamepads?.bind(navigator);
    if (!getter) return null;
    return Array.from(getter()).find((pad): pad is Gamepad => pad !== null) ?? null;
  }
}

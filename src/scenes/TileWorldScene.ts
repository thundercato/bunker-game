import Phaser from "phaser";

const VERSION = "0.3.00";
const TILE = 32;
const MAP_WIDTH = 64;
const MAP_HEIGHT = 40;
const PLAYER_SPEED = 185;

type RoomZone = {
  name: string;
  bounds: Phaser.Geom.Rectangle;
  cameraMode: "room" | "free";
};

const ROOMS: RoomZone[] = [
  {
    name: "LIVING QUARTERS",
    bounds: new Phaser.Geom.Rectangle(2 * TILE, 3 * TILE, 19 * TILE, 14 * TILE),
    cameraMode: "room",
  },
  {
    name: "CENTRAL CORRIDOR",
    bounds: new Phaser.Geom.Rectangle(21 * TILE, 6 * TILE, 19 * TILE, 7 * TILE),
    cameraMode: "free",
  },
  {
    name: "TRAINING ROOM",
    bounds: new Phaser.Geom.Rectangle(40 * TILE, 3 * TILE, 20 * TILE, 15 * TILE),
    cameraMode: "room",
  },
  {
    name: "LOWER PASSAGE",
    bounds: new Phaser.Geom.Rectangle(24 * TILE, 13 * TILE, 10 * TILE, 22 * TILE),
    cameraMode: "free",
  },
];

export class TileWorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private roomText!: Phaser.GameObjects.Text;
  private activation!: Phaser.GameObjects.Container;
  private currentRoom = "";
  private facing: "down" | "up" | "left" | "right" = "down";
  private walkFrame = 0;
  private walkTimer = 0;

  public constructor() {
    super("TileWorld");
  }

  public create(): void {
    this.createTextures();
    this.createTileMap();
    this.createPlayer();
    this.createHud();
    this.createActivationGate();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input unavailable");
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;

    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE, MAP_HEIGHT * TILE);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE, MAP_HEIGHT * TILE);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1.35);
    this.cameras.main.roundPixels = true;
  }

  public update(_time: number, delta: number): void {
    const pad = this.getGamepad();
    const move = this.readMove(pad);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(move.x * PLAYER_SPEED, move.y * PLAYER_SPEED);
    if (move.lengthSq() > 1) body.velocity.normalize().scale(PLAYER_SPEED);

    this.updateFacing(move);
    this.updatePlayerAnimation(move, delta);
    this.updateCameraMode();
  }

  private createTextures(): void {
    const makeTile = (
      key: string,
      base: number,
      accent: number,
      detail: (g: Phaser.GameObjects.Graphics) => void,
    ): void => {
      const g = this.add.graphics();
      g.fillStyle(base).fillRect(0, 0, TILE, TILE);
      g.fillStyle(accent, 0.55).fillRect(1, 1, TILE - 2, 2);
      g.fillStyle(0x000000, 0.25).fillRect(0, TILE - 3, TILE, 3);
      detail(g);
      g.generateTexture(key, TILE, TILE);
      g.destroy();
    };

    makeTile("floor-concrete", 0x30363a, 0x4b5256, (g) => {
      g.fillStyle(0x22272a).fillRect(6, 8, 2, 2);
      g.fillRect(23, 21, 3, 2);
      g.fillStyle(0x5a6063, 0.45).fillRect(14, 4, 1, 8);
    });
    makeTile("floor-cracked", 0x2b3034, 0x484f53, (g) => {
      g.lineStyle(1, 0x15191b).lineBetween(4, 7, 15, 14);
      g.lineBetween(15, 14, 10, 27);
      g.lineBetween(15, 14, 27, 18);
    });
    makeTile("floor-metal", 0x273038, 0x52606b, (g) => {
      g.lineStyle(1, 0x151b20).strokeRect(4, 4, 24, 24);
      for (const [x, y] of [[6, 6], [25, 6], [6, 25], [25, 25]] as Array<[number, number]>) {
        g.fillStyle(0x9a7741).fillCircle(x, y, 1);
      }
    });
    makeTile("floor-grate", 0x1d2429, 0x46545c, (g) => {
      g.lineStyle(2, 0x0d1114);
      for (let x = 4; x < TILE; x += 6) g.lineBetween(x, 3, x, 29);
      for (let y = 4; y < TILE; y += 7) g.lineBetween(3, y, 29, y);
    });
    makeTile("wall", 0x182027, 0x3c4952, (g) => {
      g.fillStyle(0x0b0f12).fillRect(0, 22, TILE, 10);
      g.lineStyle(2, 0x55636c).lineBetween(0, 21, TILE, 21);
      g.fillStyle(0x8a5a32).fillRect(3, 5, 3, 3);
      g.fillRect(25, 13, 2, 3);
    });
    makeTile("wall-hazard", 0x20262b, 0x4b555c, (g) => {
      for (let x = -8; x < TILE + 8; x += 12) {
        g.fillStyle(0xd1a82b).fillTriangle(x, 22, x + 8, 22, x + 16, 32);
      }
      g.fillStyle(0x111518, 0.45).fillRect(0, 0, TILE, 20);
    });
    makeTile("door", 0x27323a, 0x5b6972, (g) => {
      g.lineStyle(3, 0x11171b).strokeRect(4, 2, 24, 30);
      g.fillStyle(0x9f382b).fillRect(22, 13, 4, 7);
    });
    makeTile("crate", 0x5a4027, 0x916d42, (g) => {
      g.lineStyle(3, 0x2b1c10).strokeRect(2, 2, 28, 28);
      g.lineBetween(4, 4, 28, 28);
      g.lineBetween(28, 4, 4, 28);
    });

    this.createPlayerFrames();
  }

  private createPlayerFrames(): void {
    for (const direction of ["down", "up", "left", "right"] as const) {
      for (let frame = 0; frame < 2; frame += 1) {
        const g = this.add.graphics();
        g.fillStyle(0x171c20, 0.4).fillEllipse(16, 27, 22, 8);
        g.fillStyle(0x20282d).fillCircle(16, 8, 6);
        g.fillStyle(0x3e5c44).fillRoundedRect(9, 12, 14, 12, 3);
        g.fillStyle(0x1a2024).fillRect(10, 23, 5, frame === 0 ? 7 : 5);
        g.fillRect(17, 23, 5, frame === 0 ? 5 : 7);
        g.fillStyle(0x6d8d73).fillRect(10, 13, 12, 2);
        const eyeX = direction === "left" ? 12 : direction === "right" ? 20 : 16;
        const eyeY = direction === "up" ? 5 : 9;
        g.fillStyle(0xd5c49a).fillRect(eyeX - 1, eyeY, 2, 2);
        g.generateTexture(`player-${direction}-${frame}`, 32, 32);
        g.destroy();
      }
    }
  }

  private createTileMap(): void {
    const floor = this.add.group();
    const walls = this.physics.add.staticGroup();
    const props = this.physics.add.staticGroup();

    for (let ty = 0; ty < MAP_HEIGHT; ty += 1) {
      for (let tx = 0; tx < MAP_WIDTH; tx += 1) {
        const x = tx * TILE + TILE / 2;
        const y = ty * TILE + TILE / 2;
        const edge = tx === 0 || ty === 0 || tx === MAP_WIDTH - 1 || ty === MAP_HEIGHT - 1;
        const inPlayable = this.isPlayableTile(tx, ty);

        if (!inPlayable && !edge) continue;
        if (edge || this.isWallTile(tx, ty)) {
          const key = (tx + ty) % 9 === 0 ? "wall-hazard" : "wall";
          const wall = walls.create(x, y, key) as Phaser.Physics.Arcade.Image;
          wall.refreshBody();
          continue;
        }

        let key = "floor-concrete";
        if ((tx + ty) % 11 === 0) key = "floor-cracked";
        if (tx >= 21 && tx < 40) key = ty % 4 === 0 ? "floor-grate" : "floor-metal";
        floor.add(this.add.image(x, y, key));
      }
    }

    const propData = [
      [6, 7, "crate"], [7, 7, "crate"], [15, 12, "crate"], [46, 6, "crate"],
      [53, 13, "crate"], [30, 27, "crate"], [31, 27, "crate"],
    ] as Array<[number, number, string]>;
    for (const [tx, ty, key] of propData) {
      const prop = props.create(tx * TILE + 16, ty * TILE + 16, key) as Phaser.Physics.Arcade.Image;
      prop.refreshBody();
    }

    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.player, props);

    this.addFurniture();
  }

  private isPlayableTile(tx: number, ty: number): boolean {
    const px = tx * TILE;
    const py = ty * TILE;
    return ROOMS.some((room) => room.bounds.contains(px, py));
  }

  private isWallTile(tx: number, ty: number): boolean {
    const px = tx * TILE;
    const py = ty * TILE;
    for (const room of ROOMS) {
      if (!room.bounds.contains(px, py)) continue;
      const localX = px - room.bounds.x;
      const localY = py - room.bounds.y;
      const onEdge =
        localX < TILE || localY < TILE ||
        localX >= room.bounds.width - TILE || localY >= room.bounds.height - TILE;
      if (!onEdge) return false;

      const doorway =
        (room.name === "LIVING QUARTERS" && localX >= room.bounds.width - TILE && localY >= 5 * TILE && localY <= 8 * TILE) ||
        (room.name === "CENTRAL CORRIDOR" && ((localX < TILE && localY >= TILE && localY <= 5 * TILE) || (localX >= room.bounds.width - TILE && localY >= TILE && localY <= 5 * TILE) || (localY >= room.bounds.height - TILE && localX >= 3 * TILE && localX <= 12 * TILE))) ||
        (room.name === "TRAINING ROOM" && localX < TILE && localY >= 5 * TILE && localY <= 8 * TILE) ||
        (room.name === "LOWER PASSAGE" && localY < TILE && localX >= 2 * TILE && localX <= 7 * TILE);
      return !doorway;
    }
    return false;
  }

  private addFurniture(): void {
    const label = (x: number, y: number, text: string): void => {
      this.add.text(x, y, text, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#a9b3b8",
        backgroundColor: "#0a0e11cc",
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5);
    };

    const bed = this.add.rectangle(7 * TILE, 9 * TILE, 5 * TILE, 2.6 * TILE, 0x334a36);
    bed.setStrokeStyle(5, 0x5b3926);
    this.add.rectangle(5.3 * TILE, 8.5 * TILE, 1.4 * TILE, 1.2 * TILE, 0xb6aa99);
    label(7 * TILE, 10.7 * TILE, "BUNK");

    const bench = this.add.rectangle(16 * TILE, 8 * TILE, 5 * TILE, 2 * TILE, 0x594027);
    bench.setStrokeStyle(4, 0x24170e);
    label(16 * TILE, 9.4 * TILE, "WEAPON STATION");

    const storage = this.add.rectangle(7 * TILE, 14 * TILE, 4 * TILE, 1.6 * TILE, 0x2f4632);
    storage.setStrokeStyle(4, 0x142018);
    label(7 * TILE, 15.2 * TILE, "STORAGE");

    for (const x of [44, 49, 54, 58]) {
      const target = this.add.rectangle(x * TILE, 10 * TILE, 1.1 * TILE, 2.2 * TILE, 0x79502f);
      target.setStrokeStyle(3, 0x2b190e);
      this.add.circle(x * TILE, 8.8 * TILE, 11, 0xa46f3d).setStrokeStyle(3, 0x2b190e);
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(11 * TILE, 12 * TILE, "player-down-0");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setSize(18, 20).setOffset(7, 10);
  }

  private createHud(): void {
    this.roomText = this.add.text(18, 18, "", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#65e27c",
      backgroundColor: "#05080be8",
      padding: { x: 12, y: 8 },
    }).setScrollFactor(0).setDepth(50);

    this.add.text(1260, 698, `v${VERSION}`, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#829099",
      backgroundColor: "#05080bd0",
      padding: { x: 6, y: 3 },
    }).setOrigin(1).setScrollFactor(0).setDepth(50);
  }

  private createActivationGate(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.78).setScrollFactor(0);
    const button = this.add.rectangle(640, 360, 400, 120, 0x17351e).setScrollFactor(0);
    button.setStrokeStyle(3, 0x59dd72);
    const title = this.add.text(640, 344, "TAP TO ENTER", {
      fontFamily: "monospace", fontSize: "30px", color: "#6ff087", fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0);
    const subtitle = this.add.text(640, 390, "Smooth tile world • controller enabled", {
      fontFamily: "monospace", fontSize: "14px", color: "#d9e4dc",
    }).setOrigin(0.5).setScrollFactor(0);
    this.activation = this.add.container(0, 0, [shade, button, title, subtitle]).setDepth(100);
    button.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      navigator.getGamepads();
      this.activation.destroy();
    });
  }

  private readMove(pad: Gamepad | null): Phaser.Math.Vector2 {
    const key = (name: string): boolean => this.keys[name]?.isDown ?? false;
    const keyboardX = (this.cursors.left.isDown ? -1 : 0) + (this.cursors.right.isDown ? 1 : 0) + (key("A") ? -1 : 0) + (key("D") ? 1 : 0);
    const keyboardY = (this.cursors.up.isDown ? -1 : 0) + (this.cursors.down.isDown ? 1 : 0) + (key("W") ? -1 : 0) + (key("S") ? 1 : 0);
    const px = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? (pad?.axes[0] ?? 0) : 0;
    const py = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? (pad?.axes[1] ?? 0) : 0;
    return new Phaser.Math.Vector2(px || keyboardX, py || keyboardY).limit(1);
  }

  private updateFacing(move: Phaser.Math.Vector2): void {
    if (move.lengthSq() < 0.05) return;
    if (Math.abs(move.x) > Math.abs(move.y)) this.facing = move.x < 0 ? "left" : "right";
    else this.facing = move.y < 0 ? "up" : "down";
  }

  private updatePlayerAnimation(move: Phaser.Math.Vector2, delta: number): void {
    if (move.lengthSq() < 0.05) {
      this.walkFrame = 0;
      this.walkTimer = 0;
    } else {
      this.walkTimer += delta;
      if (this.walkTimer > 170) {
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
        this.walkTimer = 0;
      }
    }
    this.player.setTexture(`player-${this.facing}-${this.walkFrame}`);
  }

  private updateCameraMode(): void {
    const zone = ROOMS.find((room) => room.bounds.contains(this.player.x, this.player.y));
    if (!zone) return;
    if (zone.name !== this.currentRoom) {
      this.currentRoom = zone.name;
      this.roomText.setText(`${zone.name}\n${zone.cameraMode === "room" ? "FRAMED CAMERA" : "FREE CAMERA"}`);
    }

    if (zone.cameraMode === "room") {
      const camera = this.cameras.main;
      const centreX = zone.bounds.centerX;
      const centreY = zone.bounds.centerY;
      camera.stopFollow();
      camera.scrollX = Phaser.Math.Linear(camera.scrollX, centreX - camera.width / (2 * camera.zoom), 0.08);
      camera.scrollY = Phaser.Math.Linear(camera.scrollY, centreY - camera.height / (2 * camera.zoom), 0.08);
    } else if (!this.cameras.main.followTarget) {
      this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    }
  }

  private getGamepad(): Gamepad | null {
    const getter = navigator.getGamepads?.bind(navigator);
    if (!getter) return null;
    return Array.from(getter()).find((pad): pad is Gamepad => pad !== null) ?? null;
  }
}

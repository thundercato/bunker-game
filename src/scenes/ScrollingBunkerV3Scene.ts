import Phaser from "phaser";

const T = 32;
const VERSION = "0.3.00";
const SPEED = 190;

type Zone = { name: string; rect: Phaser.Geom.Rectangle; framed: boolean };
const ZONES: Zone[] = [
  {
    name: "LIVING QUARTERS",
    rect: new Phaser.Geom.Rectangle(64, 96, 576, 448),
    framed: true,
  },
  {
    name: "CENTRAL CORRIDOR",
    rect: new Phaser.Geom.Rectangle(640, 224, 576, 192),
    framed: false,
  },
  {
    name: "TRAINING ROOM",
    rect: new Phaser.Geom.Rectangle(1216, 96, 640, 480),
    framed: true,
  },
  {
    name: "LOWER PASSAGE",
    rect: new Phaser.Geom.Rectangle(800, 416, 288, 576),
    framed: false,
  },
];

export class ScrollingBunkerV3Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private props!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private label!: Phaser.GameObjects.Text;
  private gate!: Phaser.GameObjects.Container;
  private direction: "down" | "up" | "left" | "right" = "down";
  private frame = 0;
  private clock = 0;
  private room = "";
  private cameraFollowing = true;

  public constructor() {
    super("ScrollingBunkerV3");
  }

  public create(): void {
    this.makeArt();
    this.walls = this.physics.add.staticGroup();
    this.props = this.physics.add.staticGroup();
    this.player = this.physics.add
      .sprite(11 * T, 12 * T, "survivor-down-0")
      .setDepth(20);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 20).setOffset(7, 10);
    this.buildMap();
    this.makeHud();
    this.makeGate();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard unavailable");
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.props);
    this.physics.world.setBounds(0, 0, 1920, 1088);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, 1920, 1088).setZoom(1.4);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.roundPixels = true;
  }

  public update(_time: number, delta: number): void {
    const move = this.movement();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(move.x * SPEED, move.y * SPEED);
    if (move.lengthSq() > 1) body.velocity.normalize().scale(SPEED);
    this.animate(move, delta);
    this.cameraLogic();
  }

  private makeArt(): void {
    const tile = (
      key: string,
      base: number,
      top: number,
      draw: (g: Phaser.GameObjects.Graphics) => void,
    ): void => {
      const g = this.add.graphics();
      g.fillStyle(base).fillRect(0, 0, T, T);
      g.fillStyle(top, 0.65).fillRect(1, 1, 30, 2);
      g.fillStyle(0x000000, 0.25).fillRect(0, 29, 32, 3);
      draw(g);
      g.generateTexture(key, T, T);
      g.destroy();
    };
    tile("concrete", 0x30363a, 0x555c60, (g) => {
      g.fillStyle(0x1d2225).fillRect(5, 9, 2, 2);
      g.fillRect(23, 22, 3, 2);
    });
    tile("cracked", 0x292f33, 0x484f53, (g) => {
      g.lineStyle(1, 0x111518).lineBetween(5, 4, 14, 15);
      g.lineBetween(14, 15, 9, 27);
      g.lineBetween(14, 15, 27, 20);
    });
    tile("metal", 0x273139, 0x596772, (g) => {
      g.lineStyle(1, 0x13191d).strokeRect(4, 4, 24, 24);
    });
    tile("grate", 0x1c2429, 0x47555d, (g) => {
      g.lineStyle(2, 0x0b1013);
      for (let x = 4; x < 32; x += 6) g.lineBetween(x, 3, x, 29);
    });
    tile("wall", 0x172027, 0x40505a, (g) => {
      g.fillStyle(0x090d10).fillRect(0, 22, 32, 10);
      g.lineStyle(2, 0x66737b).lineBetween(0, 21, 32, 21);
    });
    tile("hazard", 0x20272c, 0x4e5a62, (g) => {
      for (let x = -10; x < 42; x += 12)
        g.fillStyle(0xcfa72d).fillTriangle(x, 22, x + 8, 22, x + 16, 32);
    });
    tile("crate", 0x5b4128, 0x946f43, (g) => {
      g.lineStyle(3, 0x2a1b10).strokeRect(2, 2, 28, 28);
      g.lineBetween(4, 4, 28, 28);
      g.lineBetween(28, 4, 4, 28);
    });

    for (const direction of ["down", "up", "left", "right"] as const)
      for (let f = 0; f < 2; f += 1) {
        const g = this.add.graphics();
        g.fillStyle(0x050709, 0.42).fillEllipse(16, 28, 22, 7);
        g.fillStyle(0x20282d).fillCircle(16, 8, 6);
        g.fillStyle(0x3e5c44).fillRoundedRect(9, 12, 14, 12, 3);
        g.fillStyle(0x1a2024).fillRect(10, 23, 5, f === 0 ? 7 : 5);
        g.fillRect(17, 23, 5, f === 0 ? 5 : 7);
        const ex = direction === "left" ? 11 : direction === "right" ? 19 : 15;
        const ey = direction === "up" ? 5 : 9;
        g.fillStyle(0xd8c79e).fillRect(ex, ey, 2, 2);
        g.generateTexture(`survivor-${direction}-${f}`, 32, 32);
        g.destroy();
      }
  }

  private buildMap(): void {
    for (let ty = 0; ty < 34; ty += 1)
      for (let tx = 0; tx < 60; tx += 1) {
        if (!this.inZone(tx, ty)) continue;
        const x = tx * T + 16;
        const y = ty * T + 16;
        if (this.isWall(tx, ty)) {
          const wall = this.walls.create(
            x,
            y,
            (tx + ty) % 10 === 0 ? "hazard" : "wall",
          ) as Phaser.Physics.Arcade.Image;
          wall.refreshBody();
        } else {
          let key = (tx + ty) % 12 === 0 ? "cracked" : "concrete";
          if (tx >= 20 && tx < 38) key = ty % 3 === 0 ? "grate" : "metal";
          this.add.image(x, y, key);
        }
      }
    for (const [tx, ty] of [
      [6, 7],
      [7, 7],
      [15, 13],
      [44, 6],
      [53, 14],
      [29, 25],
      [30, 25],
    ] as Array<[number, number]>) {
      const prop = this.props.create(
        tx * T + 16,
        ty * T + 16,
        "crate",
      ) as Phaser.Physics.Arcade.Image;
      prop.refreshBody();
    }
    this.furniture();
  }

  private inZone(tx: number, ty: number): boolean {
    return ZONES.some((z) => z.rect.contains(tx * T + 1, ty * T + 1));
  }

  private isWall(tx: number, ty: number): boolean {
    const x = tx * T + 1;
    const y = ty * T + 1;
    for (const z of ZONES) {
      if (!z.rect.contains(x, y)) continue;
      const lx = x - z.rect.x;
      const ly = y - z.rect.y;
      const edge =
        lx < T || ly < T || lx >= z.rect.width - T || ly >= z.rect.height - T;
      if (!edge) return false;
      const open =
        (z.name === "LIVING QUARTERS" &&
          lx >= z.rect.width - T &&
          ly >= 5 * T &&
          ly <= 8 * T) ||
        (z.name === "CENTRAL CORRIDOR" &&
          ((lx < T && ly >= T && ly <= 4 * T) ||
            (lx >= z.rect.width - T && ly >= T && ly <= 4 * T) ||
            (ly >= z.rect.height - T && lx >= 4 * T && lx <= 12 * T))) ||
        (z.name === "TRAINING ROOM" && lx < T && ly >= 5 * T && ly <= 8 * T) ||
        (z.name === "LOWER PASSAGE" && ly < T && lx >= 2 * T && lx <= 6 * T);
      return !open;
    }
    return false;
  }

  private furniture(): void {
    const label = (x: number, y: number, text: string): void => {
      this.add
        .text(x, y, text, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#aab4b9",
          backgroundColor: "#080c0fdd",
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(5);
    };
    this.add
      .rectangle(7 * T, 9 * T, 5 * T, 2.5 * T, 0x324a36)
      .setStrokeStyle(5, 0x5a3926)
      .setDepth(4);
    label(7 * T, 10.7 * T, "BUNK");
    this.add
      .rectangle(16 * T, 8 * T, 5 * T, 2 * T, 0x594027)
      .setStrokeStyle(4, 0x25180f)
      .setDepth(4);
    label(16 * T, 9.4 * T, "WEAPON STATION");
    this.add
      .rectangle(7 * T, 14 * T, 4 * T, 1.5 * T, 0x304833)
      .setStrokeStyle(4, 0x142018)
      .setDepth(4);
    label(7 * T, 15.1 * T, "STORAGE");
    for (const tx of [43, 48, 53, 57]) {
      this.add
        .rectangle(tx * T, 11 * T, 34, 72, 0x79502f)
        .setStrokeStyle(3, 0x2b190e)
        .setDepth(4);
      this.add
        .circle(tx * T, 9.7 * T, 11, 0xa46f3d)
        .setStrokeStyle(3, 0x2b190e)
        .setDepth(5);
    }
  }

  private makeHud(): void {
    this.label = this.add
      .text(18, 18, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#65e27c",
        backgroundColor: "#05080be8",
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.add
      .text(1260, 700, `v${VERSION}`, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#829099",
        backgroundColor: "#05080bd0",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(1)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private makeGate(): void {
    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.78)
      .setScrollFactor(0);
    const button = this.add
      .rectangle(640, 360, 400, 120, 0x17351e)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0x59dd72);
    const title = this.add
      .text(640, 344, "TAP TO ENTER", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#6ff087",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const sub = this.add
      .text(640, 390, "Tile map prototype • smooth scrolling", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#d9e4dc",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.gate = this.add
      .container(0, 0, [shade, button, title, sub])
      .setDepth(200);
    button.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      navigator.getGamepads();
      this.gate.destroy();
    });
  }

  private movement(): Phaser.Math.Vector2 {
    const pad = this.gamepad();
    const key = (name: string): boolean => this.keys[name]?.isDown ?? false;
    const kx =
      (this.cursors.left.isDown ? -1 : 0) +
      (this.cursors.right.isDown ? 1 : 0) +
      (key("A") ? -1 : 0) +
      (key("D") ? 1 : 0);
    const ky =
      (this.cursors.up.isDown ? -1 : 0) +
      (this.cursors.down.isDown ? 1 : 0) +
      (key("W") ? -1 : 0) +
      (key("S") ? 1 : 0);
    const px = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? (pad?.axes[0] ?? 0) : 0;
    const py = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? (pad?.axes[1] ?? 0) : 0;
    return new Phaser.Math.Vector2(px || kx, py || ky).limit(1);
  }

  private animate(move: Phaser.Math.Vector2, delta: number): void {
    if (move.lengthSq() > 0.05) {
      if (Math.abs(move.x) > Math.abs(move.y))
        this.direction = move.x < 0 ? "left" : "right";
      else this.direction = move.y < 0 ? "up" : "down";
      this.clock += delta;
      if (this.clock > 170) {
        this.frame = this.frame === 0 ? 1 : 0;
        this.clock = 0;
      }
    } else {
      this.frame = 0;
      this.clock = 0;
    }
    this.player.setTexture(`survivor-${this.direction}-${this.frame}`);
  }

  private cameraLogic(): void {
    const z = ZONES.find((item) =>
      item.rect.contains(this.player.x, this.player.y),
    );
    if (!z) return;
    if (z.name !== this.room) {
      this.room = z.name;
      this.label.setText(
        `${z.name}\n${z.framed ? "FRAMED CAMERA" : "FREE CAMERA"}`,
      );
    }
    const camera = this.cameras.main;
    if (z.framed) {
      if (this.cameraFollowing) {
        camera.stopFollow();
        this.cameraFollowing = false;
      }
      camera.scrollX = Phaser.Math.Linear(
        camera.scrollX,
        z.rect.centerX - camera.width / (2 * camera.zoom),
        0.08,
      );
      camera.scrollY = Phaser.Math.Linear(
        camera.scrollY,
        z.rect.centerY - camera.height / (2 * camera.zoom),
        0.08,
      );
    } else if (!this.cameraFollowing) {
      camera.startFollow(this.player, true, 0.08, 0.08);
      this.cameraFollowing = true;
    }
  }

  private gamepad(): Gamepad | null {
    return (
      Array.from(navigator.getGamepads()).find(
        (p): p is Gamepad => p !== null,
      ) ?? null
    );
  }
}

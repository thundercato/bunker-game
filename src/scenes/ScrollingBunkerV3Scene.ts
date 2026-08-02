import Phaser from "phaser";

const T = 32;
const VERSION = "0.4.00";
const SPEED = 190;
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1088;

type Direction = "down" | "up" | "left" | "right";
type Interaction = "bunk" | "storage" | "weapons";
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
  private roomLabel!: Phaser.GameObjects.Text;
  private promptLabel!: Phaser.GameObjects.Text;
  private watchLabel!: Phaser.GameObjects.Text;
  private gate!: Phaser.GameObjects.Container;
  private modal?: Phaser.GameObjects.Container;
  private touchVector = new Phaser.Math.Vector2();
  private direction: Direction = "down";
  private frame = 0;
  private animationClock = 0;
  private gameMinutes = 8 * 60;
  private minuteClock = 0;
  private room = "";
  private cameraFollowing = true;
  private entered = false;
  private interactionHeld = false;
  private closeHeld = false;
  private jerkyTaken = false;
  private cigarettesTaken = false;

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
    this.makeTouchControls();
    this.makeGate();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard unavailable");
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D,E,SPACE,ESC") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.props);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.player.setCollideWorldBounds(true);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).setZoom(1.4);
    camera.startFollow(this.player, true, 0.08, 0.08);
    camera.roundPixels = true;
    this.updateWatch();
  }

  public update(_time: number, delta: number): void {
    this.advanceClock(delta);
    this.handleCloseInput();

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!this.entered || this.modal) {
      body.setVelocity(0, 0);
      this.animate(new Phaser.Math.Vector2(), delta);
      return;
    }

    const move = this.movement();
    body.setVelocity(move.x * SPEED, move.y * SPEED);
    if (move.lengthSq() > 1) body.velocity.normalize().scale(SPEED);
    this.animate(move, delta);
    this.cameraLogic();
    this.handleInteraction();
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
      for (let x = -10; x < 42; x += 12) {
        g.fillStyle(0xcfa72d).fillTriangle(x, 22, x + 8, 22, x + 16, 32);
      }
    });
    tile("crate", 0x5b4128, 0x946f43, (g) => {
      g.lineStyle(3, 0x2a1b10).strokeRect(2, 2, 28, 28);
      g.lineBetween(4, 4, 28, 28);
      g.lineBetween(28, 4, 4, 28);
    });

    for (const direction of ["down", "up", "left", "right"] as const) {
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
  }

  private buildMap(): void {
    for (let ty = 0; ty < 34; ty += 1) {
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
    return ZONES.some((zone) => zone.rect.contains(tx * T + 1, ty * T + 1));
  }

  private isWall(tx: number, ty: number): boolean {
    const x = tx * T + 1;
    const y = ty * T + 1;
    for (const zone of ZONES) {
      if (!zone.rect.contains(x, y)) continue;
      const lx = x - zone.rect.x;
      const ly = y - zone.rect.y;
      const edge =
        lx < T ||
        ly < T ||
        lx >= zone.rect.width - T ||
        ly >= zone.rect.height - T;
      if (!edge) return false;
      const open =
        (zone.name === "LIVING QUARTERS" &&
          lx >= zone.rect.width - T &&
          ly >= 5 * T &&
          ly <= 8 * T) ||
        (zone.name === "CENTRAL CORRIDOR" &&
          ((lx < T && ly >= T && ly <= 4 * T) ||
            (lx >= zone.rect.width - T && ly >= T && ly <= 4 * T) ||
            (ly >= zone.rect.height - T && lx >= 4 * T && lx <= 12 * T))) ||
        (zone.name === "TRAINING ROOM" &&
          lx < T &&
          ly >= 5 * T &&
          ly <= 8 * T) ||
        (zone.name === "LOWER PASSAGE" && ly < T && lx >= 2 * T && lx <= 6 * T);
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
    this.roomLabel = this.add
      .text(18, 18, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#65e27c",
        backgroundColor: "#05080be8",
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.watchLabel = this.add
      .text(1260, 18, "", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#8df59d",
        backgroundColor: "#111916ef",
        padding: { x: 14, y: 9 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.promptLabel = this.add
      .text(640, 650, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f5e6b4",
        backgroundColor: "#05080bee",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

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
      .rectangle(640, 360, 1280, 720, 0x000000, 0.84)
      .setScrollFactor(0);
    const button = this.add
      .rectangle(640, 360, 430, 126, 0x17351e)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0x59dd72);
    const title = this.add
      .text(640, 340, "ENTER THE BUNKER", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#6ff087",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const sub = this.add
      .text(640, 390, "Move • explore • inspect • survive", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#d9e4dc",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.gate = this.add
      .container(0, 0, [shade, button, title, sub])
      .setDepth(220);
    button.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      navigator.getGamepads();
      this.entered = true;
      this.gate.destroy();
    });
  }

  private makeTouchControls(): void {
    const base = this.add
      .circle(105, 610, 70, 0x10191e, 0.62)
      .setStrokeStyle(2, 0x6d7f89, 0.75)
      .setScrollFactor(0)
      .setDepth(110)
      .setInteractive();
    const nub = this.add
      .circle(105, 610, 28, 0x71838d, 0.65)
      .setScrollFactor(0)
      .setDepth(111);

    const updateStick = (pointer: Phaser.Input.Pointer): void => {
      const dx = pointer.x - 105;
      const dy = pointer.y - 610;
      const vector = new Phaser.Math.Vector2(dx, dy);
      if (vector.length() > 55) vector.setLength(55);
      nub.setPosition(105 + vector.x, 610 + vector.y);
      this.touchVector.copy(vector).scale(1 / 55);
    };
    base.on("pointerdown", updateStick);
    base.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) updateStick(pointer);
    });
    const releaseStick = (): void => {
      nub.setPosition(105, 610);
      this.touchVector.set(0, 0);
    };
    base.on("pointerup", releaseStick);
    base.on("pointerout", releaseStick);

    const action = this.add
      .circle(1160, 610, 55, 0x263b2b, 0.8)
      .setStrokeStyle(3, 0x7be48e)
      .setScrollFactor(0)
      .setDepth(110)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(1160, 610, "USE", {
        fontFamily: "monospace",
        fontSize: "19px",
        color: "#baffc5",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111);
    action.on("pointerdown", () => this.tryInteract());
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
    return new Phaser.Math.Vector2(
      px || kx || this.touchVector.x,
      py || ky || this.touchVector.y,
    ).limit(1);
  }

  private animate(move: Phaser.Math.Vector2, delta: number): void {
    if (move.lengthSq() > 0.05) {
      if (Math.abs(move.x) > Math.abs(move.y)) {
        this.direction = move.x < 0 ? "left" : "right";
      } else {
        this.direction = move.y < 0 ? "up" : "down";
      }
      this.animationClock += delta;
      if (this.animationClock > 170) {
        this.frame = this.frame === 0 ? 1 : 0;
        this.animationClock = 0;
      }
    } else {
      this.frame = 0;
      this.animationClock = 0;
    }
    this.player.setTexture(`survivor-${this.direction}-${this.frame}`);
  }

  private cameraLogic(): void {
    const zone = ZONES.find((item) =>
      item.rect.contains(this.player.x, this.player.y),
    );
    if (!zone) return;

    if (zone.name !== this.room) {
      this.room = zone.name;
      this.roomLabel.setText(zone.name);
    }

    const camera = this.cameras.main;
    if (zone.framed) {
      if (this.cameraFollowing) {
        camera.stopFollow();
        this.cameraFollowing = false;
      }
      const targetZoom = Math.min(
        (camera.width - 70) / zone.rect.width,
        (camera.height - 70) / zone.rect.height,
      );
      camera.zoom = Phaser.Math.Linear(camera.zoom, targetZoom, 0.08);
      camera.scrollX = Phaser.Math.Linear(
        camera.scrollX,
        zone.rect.centerX - camera.width / (2 * camera.zoom),
        0.08,
      );
      camera.scrollY = Phaser.Math.Linear(
        camera.scrollY,
        zone.rect.centerY - camera.height / (2 * camera.zoom),
        0.08,
      );
    } else {
      camera.zoom = Phaser.Math.Linear(camera.zoom, 1.4, 0.08);
      if (!this.cameraFollowing) {
        camera.startFollow(this.player, true, 0.08, 0.08);
        this.cameraFollowing = true;
      }
    }
  }

  private handleInteraction(): void {
    const padPressed = this.gamepad()?.buttons[0]?.pressed ?? false;
    const pressed = this.keys.E.isDown || this.keys.SPACE.isDown || padPressed;
    if (pressed && !this.interactionHeld) this.tryInteract();
    this.interactionHeld = pressed;

    const nearby = this.nearbyInteraction();
    if (nearby) {
      const names: Record<Interaction, string> = {
        bunk: "BUNK",
        storage: "STORAGE CHEST",
        weapons: "WEAPON STATION",
      };
      this.promptLabel
        .setText(`E / A / USE  ${names[nearby]}`)
        .setVisible(true);
    } else {
      this.promptLabel.setVisible(false);
    }
  }

  private tryInteract(): void {
    if (!this.entered) return;
    if (this.modal) {
      this.closeModal();
      return;
    }
    const interaction = this.nearbyInteraction();
    if (interaction === "bunk") this.openBunk();
    if (interaction === "storage") this.openStorage();
    if (interaction === "weapons") this.openWeapons();
  }

  private nearbyInteraction(): Interaction | null {
    const points: Array<{
      type: Interaction;
      x: number;
      y: number;
      range: number;
    }> = [
      { type: "bunk", x: 7 * T, y: 9 * T, range: 115 },
      { type: "storage", x: 7 * T, y: 14 * T, range: 100 },
      { type: "weapons", x: 16 * T, y: 8 * T, range: 110 },
    ];
    return (
      points.find(
        (point) =>
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            point.x,
            point.y,
          ) < point.range,
      )?.type ?? null
    );
  }

  private openBunk(): void {
    const panel = this.modalBase(
      "YOUR BUNK",
      "A narrow military cot. The blanket smells faintly of dust and machine oil.",
    );
    this.addModalButton(panel, 450, "SLEEP 1 HOUR", () => this.sleep(60));
    this.addModalButton(panel, 530, "SLEEP 4 HOURS", () => this.sleep(240));
    this.addModalButton(panel, 610, "SLEEP 8 HOURS", () => this.sleep(480));
  }

  private openStorage(): void {
    const panel = this.modalBase(
      "STORAGE CHEST",
      "A battered green chest with a stubborn latch. Two useful relics remain inside.",
    );
    this.addItemCard(
      panel,
      280,
      "CIGARETTES",
      "Old military issue. Dry, but probably smokeable.",
      this.cigarettesTaken,
      () => {
        this.cigarettesTaken = true;
        this.openStorage();
      },
    );
    this.addItemCard(
      panel,
      480,
      "BEEF JERKY",
      "Salty strips sealed in cloudy plastic.",
      this.jerkyTaken,
      () => {
        this.jerkyTaken = true;
        this.openStorage();
      },
    );
  }

  private openWeapons(): void {
    const panel = this.modalBase(
      "WEAPON-CLEANING TABLE",
      "No firearm. Just the quiet archaeology of maintenance.",
    );
    const lines = [
      "• Brass bore brush, worn but serviceable",
      "• Cotton patches in a dented tin",
      "• Half-bottle of gun oil",
      "• Cleaning rod with three screw-in sections",
      "• Oily rags folded with military precision",
    ];
    panel.add(
      this.add
        .text(300, 270, lines.join("\n\n"), {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#d8d1b8",
          lineSpacing: 8,
        })
        .setScrollFactor(0),
    );
  }

  private modalBase(
    title: string,
    description: string,
  ): Phaser.GameObjects.Container {
    this.closeModal();
    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.88)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(640, 360, 850, 610, 0x141b1d, 1)
      .setStrokeStyle(4, 0x66756e)
      .setScrollFactor(0);
    const heading = this.add
      .text(640, 95, title, {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#82e594",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const copy = this.add
      .text(640, 155, description, {
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#c4cec8",
        align: "center",
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const close = this.add
      .text(640, 640, "CLOSE  •  ESC / B", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#aab5af",
        backgroundColor: "#26302c",
        padding: { x: 16, y: 9 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.closeModal());

    this.modal = this.add
      .container(0, 0, [shade, panel, heading, copy, close])
      .setDepth(300);
    this.promptLabel.setVisible(false);
    return this.modal;
  }

  private addModalButton(
    panel: Phaser.GameObjects.Container,
    y: number,
    text: string,
    action: () => void,
  ): void {
    const button = this.add
      .rectangle(640, y, 390, 58, 0x263d2b)
      .setStrokeStyle(2, 0x70d783)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", action);
    const label = this.add
      .text(640, y, text, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#baffc5",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    panel.add([button, label]);
  }

  private addItemCard(
    panel: Phaser.GameObjects.Container,
    y: number,
    title: string,
    description: string,
    taken: boolean,
    take: () => void,
  ): void {
    const card = this.add
      .rectangle(640, y, 680, 150, taken ? 0x1b2020 : 0x29352d)
      .setStrokeStyle(2, taken ? 0x424b47 : 0x70856f)
      .setScrollFactor(0);
    const heading = this.add
      .text(335, y - 45, title, {
        fontFamily: "monospace",
        fontSize: "22px",
        color: taken ? "#6f7773" : "#d6e5d7",
        fontStyle: "bold",
      })
      .setScrollFactor(0);
    const copy = this.add
      .text(335, y - 5, taken ? "TAKEN" : description, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: taken ? "#6f7773" : "#b8c2ba",
        wordWrap: { width: 430 },
      })
      .setScrollFactor(0);
    panel.add([card, heading, copy]);
    if (!taken) {
      const button = this.add
        .text(905, y + 25, "TAKE", {
          fontFamily: "monospace",
          fontSize: "17px",
          color: "#caffd2",
          backgroundColor: "#31513a",
          padding: { x: 18, y: 10 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", take);
      panel.add(button);
    }
  }

  private sleep(minutes: number): void {
    this.closeModal();
    const blackout = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(400);
    const clock = this.add
      .text(640, 360, this.formatTime(), {
        fontFamily: "monospace",
        fontSize: "62px",
        color: "#82e594",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(401)
      .setAlpha(0);

    this.tweens.add({
      targets: blackout,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        clock.setAlpha(1);
        let advanced = 0;
        const step = Math.max(1, Math.ceil(minutes / 90));
        const timer = this.time.addEvent({
          delay: 22,
          loop: true,
          callback: () => {
            const amount = Math.min(step, minutes - advanced);
            advanced += amount;
            this.gameMinutes = (this.gameMinutes + amount) % (24 * 60);
            this.updateWatch();
            clock.setText(this.formatTime());
            if (advanced >= minutes) {
              timer.remove(false);
              this.time.delayedCall(350, () => {
                clock.destroy();
                this.tweens.add({
                  targets: blackout,
                  alpha: 0,
                  duration: 650,
                  onComplete: () => blackout.destroy(),
                });
              });
            }
          },
        });
      },
    });
  }

  private closeModal(): void {
    if (!this.modal) return;
    this.modal.destroy(true);
    this.modal = undefined;
  }

  private handleCloseInput(): void {
    const gamepadClose = this.gamepad()?.buttons[1]?.pressed ?? false;
    const keyboardClose = this.keys?.ESC?.isDown ?? false;
    const pressed = gamepadClose || keyboardClose;
    if (pressed && !this.closeHeld) this.closeModal();
    this.closeHeld = pressed;
  }

  private advanceClock(delta: number): void {
    this.minuteClock += delta;
    if (this.minuteClock < 60000) return;
    const minutes = Math.floor(this.minuteClock / 60000);
    this.minuteClock %= 60000;
    this.gameMinutes = (this.gameMinutes + minutes) % (24 * 60);
    this.updateWatch();
  }

  private updateWatch(): void {
    this.watchLabel.setText(`⌚ ${this.formatTime()}`);
  }

  private formatTime(): string {
    const hours = Math.floor(this.gameMinutes / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (this.gameMinutes % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  private gamepad(): Gamepad | null {
    return (
      Array.from(navigator.getGamepads()).find(
        (pad): pad is Gamepad => pad !== null,
      ) ?? null
    );
  }
}

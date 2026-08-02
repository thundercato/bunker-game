import Phaser from "phaser";

const TILE = 32;
const VERSION = "0.5.00";
const WALK_SPEED = 95;
const RUN_SPEED = WALK_SPEED * 1.5;
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
  slot: number;
  taken: boolean;
};

type Zone = {
  name: string;
  rect: Phaser.Geom.Rectangle;
  framed: boolean;
};

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

export class BunkerV5Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private props!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private roomLabel!: Phaser.GameObjects.Text;
  private promptLabel!: Phaser.GameObjects.Text;
  private watchLabel!: Phaser.GameObjects.Text;
  private staminaFill!: Phaser.GameObjects.Rectangle;
  private gate!: Phaser.GameObjects.Container;
  private modal: Phaser.GameObjects.Container | undefined;
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
  private stamina = 100;
  private health = 100;
  private hunger = 82;
  private thirst = 74;
  private readonly items: StoredItem[] = [
    {
      id: "cigarettes",
      name: "PACKET OF CIGARETTES",
      description: "A crushed military-green packet with six cigarettes left.",
      details:
        "The paper is dry and the tobacco still smells usable. Smoking may calm nerves later, but it will not do your lungs any favours.",
      slot: 1,
      taken: false,
    },
    {
      id: "jerky",
      name: "BEEF JERKY",
      description: "Salted beef strips sealed in cloudy plastic.",
      details:
        "A compact ration with enough protein to take the edge off hunger. The packet is intact and the meat looks aggressively preserved.",
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
    this.player = this.physics.add
      .sprite(11 * TILE, 12 * TILE, "survivor-down-0")
      .setDepth(20)
      .setScale(1, 2);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 24).setOffset(7, 36);

    this.buildMap();
    this.makeHud();
    this.makeGate();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard unavailable");
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D,E,SPACE,ESC,SHIFT") as Record<
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
    this.updateStaminaBar();
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

  private makeArt(): void {
    const tile = (
      key: string,
      base: number,
      top: number,
      draw: (graphics: Phaser.GameObjects.Graphics) => void,
    ): void => {
      const graphics = this.add.graphics();
      graphics.fillStyle(base).fillRect(0, 0, TILE, TILE);
      graphics.fillStyle(top, 0.65).fillRect(1, 1, 30, 2);
      graphics.fillStyle(0x000000, 0.25).fillRect(0, 29, 32, 3);
      draw(graphics);
      graphics.generateTexture(key, TILE, TILE);
      graphics.destroy();
    };

    tile("concrete-v5", 0x30363a, 0x555c60, (graphics) => {
      graphics.fillStyle(0x1d2225).fillRect(5, 9, 2, 2);
      graphics.fillRect(23, 22, 3, 2);
    });
    tile("cracked-v5", 0x292f33, 0x484f53, (graphics) => {
      graphics.lineStyle(1, 0x111518).lineBetween(5, 4, 14, 15);
      graphics.lineBetween(14, 15, 9, 27);
      graphics.lineBetween(14, 15, 27, 20);
    });
    tile("metal-v5", 0x273139, 0x596772, (graphics) => {
      graphics.lineStyle(1, 0x13191d).strokeRect(4, 4, 24, 24);
    });
    tile("grate-v5", 0x1c2429, 0x47555d, (graphics) => {
      graphics.lineStyle(2, 0x0b1013);
      for (let x = 4; x < 32; x += 6) graphics.lineBetween(x, 3, x, 29);
    });
    tile("wall-v5", 0x172027, 0x40505a, (graphics) => {
      graphics.fillStyle(0x090d10).fillRect(0, 22, 32, 10);
      graphics.lineStyle(2, 0x66737b).lineBetween(0, 21, 32, 21);
    });
    tile("hazard-v5", 0x20272c, 0x4e5a62, (graphics) => {
      for (let x = -10; x < 42; x += 12) {
        graphics.fillStyle(0xcfa72d).fillTriangle(x, 22, x + 8, 22, x + 16, 32);
      }
    });
    tile("crate-v5", 0x5b4128, 0x946f43, (graphics) => {
      graphics.lineStyle(3, 0x2a1b10).strokeRect(2, 2, 28, 28);
      graphics.lineBetween(4, 4, 28, 28);
      graphics.lineBetween(28, 4, 4, 28);
    });

    for (const direction of ["down", "up", "left", "right"] as const) {
      for (let frame = 0; frame < 2; frame += 1) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x050709, 0.42).fillEllipse(16, 30, 22, 6);
        graphics.fillStyle(0x252b2f).fillCircle(16, 8, 6);
        graphics.fillStyle(0x405f47).fillRoundedRect(9, 13, 14, 14, 3);
        graphics.fillStyle(0x1b2125).fillRect(10, 26, 5, frame === 0 ? 6 : 4);
        graphics.fillRect(17, 26, 5, frame === 0 ? 4 : 6);
        const eyeX =
          direction === "left" ? 11 : direction === "right" ? 19 : 15;
        const eyeY = direction === "up" ? 5 : 9;
        graphics.fillStyle(0xd8c79e).fillRect(eyeX, eyeY, 2, 2);
        graphics.generateTexture(`survivor-${direction}-${frame}`, 32, 32);
        graphics.destroy();
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
          const wall = this.walls.create(
            x,
            y,
            (tileX + tileY) % 10 === 0 ? "hazard-v5" : "wall-v5",
          ) as Phaser.Physics.Arcade.Image;
          wall.refreshBody();
        } else {
          let key = (tileX + tileY) % 12 === 0 ? "cracked-v5" : "concrete-v5";
          if (tileX >= 20 && tileX < 38) {
            key = tileY % 3 === 0 ? "grate-v5" : "metal-v5";
          }
          this.add.image(x, y, key);
        }
      }
    }

    for (const [tileX, tileY] of [
      [6, 7],
      [7, 7],
      [15, 13],
      [44, 6],
      [53, 14],
      [29, 25],
      [30, 25],
    ] as Array<[number, number]>) {
      const prop = this.props.create(
        tileX * TILE + 16,
        tileY * TILE + 16,
        "crate-v5",
      ) as Phaser.Physics.Arcade.Image;
      prop.refreshBody();
    }
    this.furniture();
  }

  private inZone(tileX: number, tileY: number): boolean {
    return ZONES.some((zone) =>
      zone.rect.contains(tileX * TILE + 1, tileY * TILE + 1),
    );
  }

  private isWall(tileX: number, tileY: number): boolean {
    const x = tileX * TILE + 1;
    const y = tileY * TILE + 1;
    for (const zone of ZONES) {
      if (!zone.rect.contains(x, y)) continue;
      const localX = x - zone.rect.x;
      const localY = y - zone.rect.y;
      const edge =
        localX < TILE ||
        localY < TILE ||
        localX >= zone.rect.width - TILE ||
        localY >= zone.rect.height - TILE;
      if (!edge) return false;
      const open =
        (zone.name === "LIVING QUARTERS" &&
          localX >= zone.rect.width - TILE &&
          localY >= 5 * TILE &&
          localY <= 8 * TILE) ||
        (zone.name === "CENTRAL CORRIDOR" &&
          ((localX < TILE && localY >= TILE && localY <= 4 * TILE) ||
            (localX >= zone.rect.width - TILE &&
              localY >= TILE &&
              localY <= 4 * TILE) ||
            (localY >= zone.rect.height - TILE &&
              localX >= 4 * TILE &&
              localX <= 12 * TILE))) ||
        (zone.name === "TRAINING ROOM" &&
          localX < TILE &&
          localY >= 5 * TILE &&
          localY <= 8 * TILE) ||
        (zone.name === "LOWER PASSAGE" &&
          localY < TILE &&
          localX >= 2 * TILE &&
          localX <= 6 * TILE);
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
      .rectangle(7 * TILE, 9 * TILE, 5 * TILE, 2.5 * TILE, 0x324a36)
      .setStrokeStyle(5, 0x5a3926)
      .setDepth(4);
    label(7 * TILE, 10.7 * TILE, "BUNK");

    this.add
      .rectangle(16 * TILE, 8 * TILE, 5 * TILE, 2 * TILE, 0x594027)
      .setStrokeStyle(4, 0x25180f)
      .setDepth(4);
    label(16 * TILE, 9.4 * TILE, "WEAPON STATION");

    this.add
      .rectangle(7 * TILE, 14 * TILE, 4 * TILE, 1.5 * TILE, 0x304833)
      .setStrokeStyle(4, 0x142018)
      .setDepth(4);
    label(7 * TILE, 15.1 * TILE, "STORAGE");
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

    const watchBack = this.add
      .rectangle(1256, 24, 190, 54, 0x101713, 0.96)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0x667b6d)
      .setDepth(100);
    this.watchLabel = this.add
      .text(1238, 34, "", {
        fontFamily: "monospace",
        fontSize: "25px",
        color: "#8df59d",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(101);
    watchBack.setVisible(true);

    this.makeStatusBar(1076, 88, "HEALTH", 0xc53b3b, this.health);
    this.makeStatusBar(1076, 116, "HUNGER", 0xd7b938, this.hunger);
    this.makeStatusBar(1076, 144, "THIRST", 0x3b86d1, this.thirst);

    this.add
      .text(1076, 176, "STAMINA", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#b9c4bd",
      })
      .setScrollFactor(0)
      .setDepth(101);
    this.add
      .rectangle(1168, 184, 176, 12, 0x18211d)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x53625a)
      .setScrollFactor(0)
      .setDepth(100);
    this.staminaFill = this.add
      .rectangle(1168, 184, 176, 10, 0x69c97d)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

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

  private makeStatusBar(
    x: number,
    y: number,
    label: string,
    colour: number,
    value: number,
  ): void {
    this.add
      .text(x, y - 7, label, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#c8d0ca",
      })
      .setScrollFactor(0)
      .setDepth(101);
    this.add
      .rectangle(x + 92, y, 176, 12, 0x18211d)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x53625a)
      .setScrollFactor(0)
      .setDepth(100);
    this.add
      .rectangle(x + 92, y, 176 * (value / 100), 10, colour)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);
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
      .text(640, 330, `BUNKER v${VERSION}`, {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#6ff087",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const sub = this.add
      .text(640, 382, "TAP TO ENTER", {
        fontFamily: "monospace",
        fontSize: "18px",
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

  private movement(): Phaser.Math.Vector2 {
    const pad = this.gamepad();
    const key = (name: string): boolean => this.keys[name]?.isDown ?? false;
    const keyboardX =
      (this.cursors.left.isDown ? -1 : 0) +
      (this.cursors.right.isDown ? 1 : 0) +
      (key("A") ? -1 : 0) +
      (key("D") ? 1 : 0);
    const keyboardY =
      (this.cursors.up.isDown ? -1 : 0) +
      (this.cursors.down.isDown ? 1 : 0) +
      (key("W") ? -1 : 0) +
      (key("S") ? 1 : 0);
    const padX = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? (pad?.axes[0] ?? 0) : 0;
    const padY = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? (pad?.axes[1] ?? 0) : 0;
    return new Phaser.Math.Vector2(padX || keyboardX, padY || keyboardY).limit(
      1,
    );
  }

  private runPressed(): boolean {
    const leftStickClick = this.gamepad()?.buttons[10]?.pressed ?? false;
    return leftStickClick || this.keys.SHIFT.isDown;
  }

  private updateStamina(running: boolean, delta: number): void {
    const seconds = delta / 1000;
    if (running) {
      this.stamina = Math.max(
        0,
        this.stamina - STAMINA_DRAIN_PER_SECOND * seconds,
      );
    } else {
      this.stamina = Math.min(
        100,
        this.stamina + STAMINA_REFILL_PER_SECOND * seconds,
      );
    }
    this.updateStaminaBar();
  }

  private updateStaminaBar(): void {
    this.staminaFill.width = 176 * (this.stamina / 100);
    this.staminaFill.setFillStyle(this.stamina > 20 ? 0x69c97d : 0xc8664d);
  }

  private animate(
    move: Phaser.Math.Vector2,
    delta: number,
    running = false,
  ): void {
    if (move.lengthSq() > 0.05) {
      if (Math.abs(move.x) > Math.abs(move.y)) {
        this.direction = move.x < 0 ? "left" : "right";
      } else {
        this.direction = move.y < 0 ? "up" : "down";
      }
      this.animationClock += delta;
      const frameDelay = running ? 100 : 240;
      if (this.animationClock > frameDelay) {
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
    const zone = ZONES.find((candidate) =>
      candidate.rect.contains(this.player.x, this.player.y),
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
    const gamepadInteract = this.gamepad()?.buttons[0]?.pressed ?? false;
    const pressed =
      this.keys.E.isDown || this.keys.SPACE.isDown || gamepadInteract;
    if (pressed && !this.interactionHeld) this.tryInteract();
    this.interactionHeld = pressed;

    const nearby = this.nearbyInteraction();
    if (!nearby) {
      this.promptLabel.setVisible(false);
      return;
    }
    const names: Record<Interaction, string> = {
      bunk: "BUNK",
      storage: "STORAGE TRUNK",
      weapons: "WEAPON STATION",
    };
    this.promptLabel.setText(`USE / A  ${names[nearby]}`).setVisible(true);
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
      { type: "bunk", x: 7 * TILE, y: 9 * TILE, range: 120 },
      { type: "storage", x: 7 * TILE, y: 14 * TILE, range: 105 },
      { type: "weapons", x: 16 * TILE, y: 8 * TILE, range: 115 },
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
      "A narrow military cot under cold concrete. Sleep controls will be expanded in the next pass.",
    );
    this.addModalButton(panel, 520, "SLEEP 1 HOUR", () => this.sleep(60));
    this.addModalButton(panel, 590, "BACK", () => this.closeModal());
  }

  private openWeapons(): void {
    const panel = this.modalBase(
      "WEAPON-CLEANING TABLE",
      "No weapons. Only bore brushes, cotton patches, gun oil and old cleaning rods.",
    );
    this.addModalButton(panel, 590, "BACK", () => this.closeModal());
  }

  private openStorage(): void {
    const panel = this.modalBase(
      "STORAGE TRUNK",
      "18 storage slots. Select an item to inspect it.",
    );

    const startX = 355;
    const startY = 245;
    const size = 82;
    const gap = 12;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const slot = row * 6 + column;
        const x = startX + column * (size + gap);
        const y = startY + row * (size + gap);
        const item = this.items.find(
          (candidate) => candidate.slot === slot && !candidate.taken,
        );
        const cell = this.add
          .rectangle(x, y, size, size, 0x202927, 0.88)
          .setStrokeStyle(2, item ? 0x8da184 : 0x4e5a55)
          .setScrollFactor(0);
        panel.add(cell);
        if (!item) continue;

        const icon = this.itemIcon(item.id, x, y - 8).setScrollFactor(0);
        const label = this.add
          .text(x, y + 29, item.id === "cigarettes" ? "CIGS" : "JERKY", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#dce7dc",
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        cell.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          this.openItemDetail(item.id);
        });
        icon.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          this.openItemDetail(item.id);
        });
        panel.add([icon, label]);
      }
    }
    this.addModalButton(panel, 625, "BACK", () => this.closeModal());
  }

  private openItemDetail(itemId: ItemId): void {
    const item = this.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const panel = this.modalBase(item.name, item.description);
    panel.add(this.itemIllustration(item.id));
    panel.add(
      this.add
        .text(640, 450, item.details, {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#cbd4ce",
          align: "center",
          wordWrap: { width: 660 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0),
    );
    if (!item.taken) {
      this.addModalButton(panel, 565, "TAKE", () => {
        item.taken = true;
        this.openStorage();
      });
    }
    this.addModalButton(panel, 625, "BACK", () => this.openStorage());
  }

  private itemIcon(
    itemId: ItemId,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    if (itemId === "cigarettes") {
      const pack = this.add
        .rectangle(x, y, 36, 48, 0x66745a)
        .setStrokeStyle(2, 0xd8cdb0);
      const stripe = this.add.rectangle(x, y + 8, 32, 8, 0xa63f35);
      return this.add.container(0, 0, [pack, stripe]);
    }
    const packet = this.add
      .rectangle(x, y, 48, 38, 0x8c6a42)
      .setStrokeStyle(2, 0xd4b17a);
    const meat = this.add.rectangle(x, y, 32, 10, 0x5d2e1f).setAngle(-12);
    return this.add.container(0, 0, [packet, meat]);
  }

  private itemIllustration(itemId: ItemId): Phaser.GameObjects.Container {
    const frame = this.add
      .rectangle(640, 305, 360, 220, 0x0d1212)
      .setStrokeStyle(3, 0x69756e)
      .setScrollFactor(0);
    const grime = this.add
      .rectangle(640, 305, 344, 204, 0x3a413d, 0.35)
      .setScrollFactor(0);
    if (itemId === "cigarettes") {
      const pack = this.add
        .rectangle(640, 305, 120, 164, 0x68765c)
        .setStrokeStyle(4, 0xd7ccb0)
        .setScrollFactor(0);
      const stripe = this.add
        .rectangle(640, 335, 112, 28, 0xa34337)
        .setScrollFactor(0);
      const text = this.add
        .text(640, 280, "№ 6\nFILTER", {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#e0d7bc",
          align: "center",
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      return this.add.container(0, 0, [frame, grime, pack, stripe, text]);
    }
    const packet = this.add
      .rectangle(640, 305, 220, 132, 0x8d6b43)
      .setStrokeStyle(4, 0xd2ad72)
      .setScrollFactor(0);
    const meatOne = this.add
      .rectangle(620, 295, 150, 22, 0x5b2e20)
      .setAngle(-8)
      .setScrollFactor(0);
    const meatTwo = this.add
      .rectangle(666, 326, 132, 20, 0x6b3723)
      .setAngle(11)
      .setScrollFactor(0);
    return this.add.container(0, 0, [frame, grime, packet, meatOne, meatTwo]);
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
      .rectangle(640, 360, 850, 610, 0x141b1d)
      .setStrokeStyle(4, 0x66756e)
      .setScrollFactor(0);
    const heading = this.add
      .text(640, 90, title, {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#82e594",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const copy = this.add
      .text(640, 145, description, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#c4cec8",
        align: "center",
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.modal = this.add
      .container(0, 0, [shade, panel, heading, copy])
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
      .rectangle(640, y, 330, 52, 0x263d2b)
      .setStrokeStyle(2, 0x70d783)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", action);
    const label = this.add
      .text(640, y, text, {
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#baffc5",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    panel.add([button, label]);
  }

  private sleep(minutes: number): void {
    this.closeModal();
    this.gameMinutes = (this.gameMinutes + minutes) % (24 * 60);
    this.updateWatch();
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
    this.watchLabel.setText(this.formatTime());
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

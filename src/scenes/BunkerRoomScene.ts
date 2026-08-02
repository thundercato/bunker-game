import Phaser from "phaser";

const VERSION = "0.1.00";
const PLAYER_SPEED = 210;
const INTERACT_DISTANCE = 92;

type StationKind = "bed" | "weapons" | "storage" | "cooking" | "door";

type Station = {
  kind: StationKind;
  x: number;
  y: number;
  label: string;
};

const STATIONS: Station[] = [
  { kind: "bed", x: 270, y: 225, label: "Sleep" },
  { kind: "weapons", x: 840, y: 195, label: "Weapon Station" },
  { kind: "storage", x: 280, y: 475, label: "Open Storage" },
  { kind: "cooking", x: 995, y: 470, label: "Cook" },
  { kind: "door", x: 640, y: 590, label: "Open Door" },
];

export class BunkerRoomScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private prompt!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private modal!: Phaser.GameObjects.Container;
  private modalTitle!: Phaser.GameObjects.Text;
  private modalBody!: Phaser.GameObjects.Text;
  private activation!: Phaser.GameObjects.Container;
  private doorPanel!: Phaser.GameObjects.Rectangle;
  private currentStation: Station | null = null;
  private modalOpen = false;
  private doorOpen = false;
  private previousInteract = false;
  private previousBack = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  public constructor() {
    super("BunkerRoom");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#05090d");
    this.drawWorld();
    this.drawHud();
    this.createPlayer();
    this.createPrompt();
    this.createModal();
    this.createActivationGate();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,X,SPACE,ESC") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
  }

  public update(_time: number, delta: number): void {
    const pad = this.getGamepad();
    const keyboardX =
      (this.cursors.left?.isDown ? -1 : 0) +
      (this.cursors.right?.isDown ? 1 : 0) +
      (this.keys.A?.isDown ? -1 : 0) +
      (this.keys.D?.isDown ? 1 : 0);
    const keyboardY =
      (this.cursors.up?.isDown ? -1 : 0) +
      (this.cursors.down?.isDown ? 1 : 0) +
      (this.keys.W?.isDown ? -1 : 0) +
      (this.keys.S?.isDown ? 1 : 0);

    const axisX = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? (pad?.axes[0] ?? 0) : 0;
    const axisY = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? (pad?.axes[1] ?? 0) : 0;
    const move = new Phaser.Math.Vector2(axisX || keyboardX, axisY || keyboardY);

    const interactDown =
      Boolean(pad?.buttons[0]?.pressed) ||
      Boolean(this.keys.E?.isDown) ||
      Boolean(this.keys.X?.isDown) ||
      Boolean(this.keys.SPACE?.isDown);
    const backDown = Boolean(pad?.buttons[1]?.pressed) || Boolean(this.keys.ESC?.isDown);

    if (this.modalOpen) {
      if (backDown && !this.previousBack) this.closeModal();
    } else {
      this.movePlayer(move, delta);
      this.updateInteractionPrompt();
      if (interactDown && !this.previousInteract && this.currentStation) {
        this.interact(this.currentStation.kind);
      }
    }

    this.previousInteract = interactDown;
    this.previousBack = backDown;
  }

  private drawWorld(): void {
    const g = this.add.graphics();

    g.fillStyle(0x070b0f).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x111820).fillRoundedRect(120, 55, 1040, 540, 24);
    g.lineStyle(8, 0x29313a).strokeRoundedRect(120, 55, 1040, 540, 24);
    g.lineStyle(2, 0x46505b).strokeRoundedRect(133, 68, 1014, 514, 18);

    for (let x = 150; x < 1140; x += 42) {
      for (let y = 85; y < 575; y += 42) {
        const tone = (x + y) % 84 === 0 ? 0x1a232c : 0x161e26;
        g.fillStyle(tone).fillRect(x, y, 39, 39);
      }
    }

    g.fillStyle(0x171c21).fillRect(535, 595, 210, 125);
    g.lineStyle(8, 0x303841).strokeRect(535, 595, 210, 125);
    g.lineStyle(2, 0x59636d).strokeRect(548, 608, 184, 112);
    for (let y = 620; y < 715; y += 34) {
      g.lineStyle(2, 0x252c33).lineBetween(555, y, 725, y);
    }

    this.drawBed(195, 135);
    this.drawWeaponBench(730, 120);
    this.drawStorage(185, 420);
    this.drawCooking(915, 385);
    this.drawLights();
    this.drawCorridorDetails();

    this.doorPanel = this.add.rectangle(640, 592, 190, 48, 0x222b33);
    this.doorPanel.setStrokeStyle(5, 0x58636e);
    this.add.rectangle(640, 568, 48, 8, 0xa83322);

    this.add
      .text(640, 685, "CORRIDOR 1", {
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#8f9aa4",
        backgroundColor: "#05080b",
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5);
  }

  private drawBed(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x452c1c).fillRoundedRect(x, y, 220, 190, 8);
    g.fillStyle(0x28392b).fillRoundedRect(x + 12, y + 48, 196, 130, 4);
    g.fillStyle(0xb8ada0).fillRoundedRect(x + 12, y + 12, 196, 52, 8);
    g.fillStyle(0x887d70).fillRoundedRect(x + 22, y + 20, 80, 36, 8);
    g.lineStyle(4, 0x21170f).strokeRoundedRect(x, y, 220, 190, 8);
    this.add.text(x + 16, y - 22, "BUNK", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#7f8b93",
    });
  }

  private drawWeaponBench(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x573c25).fillRoundedRect(x, y + 45, 300, 130, 6);
    g.fillStyle(0x241d16).fillRect(x + 15, y + 62, 270, 22);
    g.fillStyle(0x334630).fillRoundedRect(x + 30, y + 20, 105, 45, 6);
    g.fillStyle(0x8c8f8d).fillTriangle(x + 175, y + 30, x + 250, y + 48, x + 175, y + 60);
    g.fillStyle(0x8e3b28).fillRect(x + 245, y + 41, 38, 10);
    g.lineStyle(4, 0x21170f).strokeRoundedRect(x, y + 45, 300, 130, 6);
    this.add.text(x + 18, y - 5, "WEAPON STATION", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#9aa5ad",
    });
  }

  private drawStorage(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x2c3f2e).fillRoundedRect(x, y, 215, 110, 8);
    g.fillStyle(0x1b281d).fillRect(x + 15, y + 28, 185, 56);
    g.lineStyle(4, 0x101711).strokeRoundedRect(x, y, 215, 110, 8);
    g.lineStyle(3, 0x526452).lineBetween(x + 108, y + 6, x + 108, y + 104);
    g.fillStyle(0x8b7c52).fillRect(x + 96, y + 48, 24, 14);
    this.add.text(x + 15, y - 22, "STORAGE", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#7f8b93",
    });
  }

  private drawCooking(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x44484a).fillRoundedRect(x, y + 40, 165, 125, 6);
    g.fillStyle(0x15191b).fillCircle(x + 48, y + 80, 29);
    g.fillStyle(0x22282b).fillCircle(x + 48, y + 80, 21);
    g.fillStyle(0x8b5d2c).fillEllipse(x + 48, y + 76, 30, 12);
    g.fillStyle(0x242a2d).fillRect(x + 95, y + 58, 48, 62);
    g.lineStyle(4, 0x202426).strokeRoundedRect(x, y + 40, 165, 125, 6);
    this.add.text(x + 8, y + 8, "COOKING", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#7f8b93",
    });
  }

  private drawLights(): void {
    const g = this.add.graphics();
    for (const [x, y] of [
      [440, 94],
      [640, 94],
      [840, 94],
      [565, 655],
      [715, 655],
    ] as Array<[number, number]>) {
      g.fillStyle(0x5f4a27, 0.18).fillCircle(x, y, 78);
      g.fillStyle(0xf2c76d).fillRoundedRect(x - 25, y - 5, 50, 10, 4);
      g.fillStyle(0xffe3a3).fillRoundedRect(x - 18, y - 3, 36, 6, 3);
    }
  }

  private drawCorridorDetails(): void {
    const g = this.add.graphics();
    g.fillStyle(0x30383f).fillRect(560, 630, 8, 90);
    g.fillStyle(0x30383f).fillRect(712, 630, 8, 90);
    g.lineStyle(3, 0x171c20).lineBetween(584, 610, 584, 720);
    g.lineStyle(3, 0x171c20).lineBetween(696, 610, 696, 720);
  }

  private drawHud(): void {
    this.panel(18, 18, 192, 150);
    this.add.text(34, 34, "DAY 1", {
      fontFamily: "monospace",
      fontSize: "25px",
      color: "#54e36d",
      fontStyle: "bold",
    });
    this.add.text(34, 72, "06:00", {
      fontFamily: "monospace",
      fontSize: "19px",
      color: "#eef2f5",
    });
    this.add.text(34, 112, "BUNKER STATUS\nALL SYSTEMS NORMAL", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#7be487",
      lineSpacing: 7,
    });

    this.panel(20, 535, 275, 165);
    this.add.text(38, 552, "HEALTH      100/100", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#55e66f",
    });
    this.bar(38, 580, 225, 12, 0x42d85d, 1);
    this.add.text(38, 610, "HUNGER        75/100", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#f5b538",
    });
    this.bar(38, 638, 225, 12, 0xe5a626, 0.75);
    this.add.text(38, 668, "THIRST        60/100", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#4b9dff",
    });

    this.panel(1040, 18, 220, 115);
    this.add.text(1058, 35, "OBJECTIVE", {
      fontFamily: "monospace",
      fontSize: "17px",
      color: "#51dc68",
      fontStyle: "bold",
    });
    this.add.text(1058, 70, "Explore the bunker\nStay alive.", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#e6eaed",
      lineSpacing: 8,
    });

    this.add.text(1100, 690, `v${VERSION}`, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#66717a",
    });
  }

  private panel(x: number, y: number, width: number, height: number): void {
    const panel = this.add.rectangle(x, y, width, height, 0x05080b, 0.93).setOrigin(0);
    panel.setStrokeStyle(2, 0x3a444d);
  }

  private bar(
    x: number,
    y: number,
    width: number,
    height: number,
    colour: number,
    value: number,
  ): void {
    this.add.rectangle(x, y, width, height, 0x252b30).setOrigin(0);
    this.add.rectangle(x, y, width * value, height, colour).setOrigin(0);
  }

  private createPlayer(): void {
    const body = this.add.graphics();
    body.fillStyle(0x232b31).fillCircle(0, -16, 11);
    body.fillStyle(0x314b37).fillRoundedRect(-14, -6, 28, 34, 7);
    body.fillStyle(0x20292d).fillRect(-17, 5, 7, 24);
    body.fillRect(10, 5, 7, 24);
    body.fillStyle(0x1a1f22).fillRect(-11, 28, 8, 18);
    body.fillRect(3, 28, 8, 18);
    body.lineStyle(2, 0x65846d).strokeRoundedRect(-14, -6, 28, 34, 7);
    this.player = this.add.container(640, 365, [body]);
    this.player.setDepth(10);
  }

  private createPrompt(): void {
    const background = this.add.rectangle(0, 0, 260, 46, 0x020406, 0.96);
    background.setStrokeStyle(2, 0x56616a);
    const button = this.add.circle(-103, 0, 15, 0x123c72);
    button.setStrokeStyle(2, 0x4b9dff);
    const x = this.add
      .text(-103, 0, "X", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#d7eaff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.promptText = this.add
      .text(-78, 0, "Interact", {
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#f4f6f7",
      })
      .setOrigin(0, 0.5);
    this.prompt = this.add.container(640, 510, [background, button, x, this.promptText]);
    this.prompt.setDepth(20).setVisible(false);
  }

  private createModal(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.72);
    const panel = this.add.rectangle(640, 360, 550, 300, 0x0b1015, 0.98);
    panel.setStrokeStyle(3, 0x65717a);
    this.modalTitle = this.add
      .text(640, 270, "STATION", {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#62df78",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.modalBody = this.add
      .text(640, 355, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#e5eaed",
        align: "center",
        lineSpacing: 10,
        wordWrap: { width: 470 },
      })
      .setOrigin(0.5);
    const close = this.add
      .text(640, 470, "B  Close", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#aab3b9",
      })
      .setOrigin(0.5);
    this.modal = this.add.container(0, 0, [shade, panel, this.modalTitle, this.modalBody, close]);
    this.modal.setDepth(50).setVisible(false);
  }

  private createActivationGate(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x020406, 0.9);
    const panel = this.add.rectangle(640, 360, 590, 260, 0x0b1117, 1);
    panel.setStrokeStyle(3, 0x52708a);
    const title = this.add
      .text(640, 290, "BUNKER GAME", {
        fontFamily: "monospace",
        fontSize: "34px",
        color: "#5be173",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const text = this.add
      .text(640, 345, "Tap to activate controller and audio", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#d6dde2",
      })
      .setOrigin(0.5);
    const button = this.add.rectangle(640, 410, 330, 58, 0x173e66, 1);
    button.setStrokeStyle(2, 0x5da9ed).setInteractive({ useHandCursor: true });
    const label = this.add
      .text(640, 410, "TAP TO ENTER", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.activation = this.add.container(0, 0, [shade, panel, title, text, button, label]);
    this.activation.setDepth(100);
    button.on("pointerdown", () => this.activation.destroy());
  }

  private getGamepad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    return Array.from(pads).find((pad): pad is Gamepad => pad !== null) ?? null;
  }

  private movePlayer(move: Phaser.Math.Vector2, delta: number): void {
    if (move.lengthSq() > 1) move.normalize();
    const distance = (PLAYER_SPEED * delta) / 1000;
    const nextX = this.player.x + move.x * distance;
    const nextY = this.player.y + move.y * distance;

    const minX = 155;
    const maxX = 1125;
    const minY = 95;
    const maxY = this.doorOpen ? 715 : 555;
    const corridorMinX = 565;
    const corridorMaxX = 715;

    if (nextY > 565) {
      this.player.x = Phaser.Math.Clamp(nextX, corridorMinX, corridorMaxX);
      this.player.y = Phaser.Math.Clamp(nextY, 565, maxY);
    } else {
      this.player.x = Phaser.Math.Clamp(nextX, minX, maxX);
      this.player.y = Phaser.Math.Clamp(nextY, minY, maxY);
    }
  }

  private updateInteractionPrompt(): void {
    let nearest: Station | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const station of STATIONS) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        station.x,
        station.y,
      );
      if (distance < INTERACT_DISTANCE && distance < nearestDistance) {
        nearest = station;
        nearestDistance = distance;
      }
    }

    this.currentStation = nearest;
    if (!nearest) {
      this.prompt.setVisible(false);
      return;
    }
    this.promptText.setText(nearest.kind === "door" && this.doorOpen ? "Close Door" : nearest.label);
    this.prompt.setPosition(nearest.x, Math.max(110, nearest.y - 72)).setVisible(true);
  }

  private interact(kind: StationKind): void {
    switch (kind) {
      case "bed":
        this.showModal("BUNK", "You lie down for a moment.\n\nGame saved.\nDay 1 • 06:00");
        break;
      case "weapons":
        this.showModal("WEAPON STATION", "EQUIPPED\n\n► Utility Knife\n\nMore weapon slots are locked.");
        break;
      case "storage":
        this.showModal("STORAGE", "The storage box is empty.\n\nCapacity: 0 / 24");
        break;
      case "cooking":
        this.showModal("COOKING STATION", "Nothing to cook.\n\nFind ingredients in the corridors.");
        break;
      case "door":
        this.toggleDoor();
        break;
    }
  }

  private showModal(title: string, body: string): void {
    this.modalTitle.setText(title);
    this.modalBody.setText(body);
    this.modal.setVisible(true);
    this.modalOpen = true;
    this.prompt.setVisible(false);
  }

  private closeModal(): void {
    this.modal.setVisible(false);
    this.modalOpen = false;
  }

  private toggleDoor(): void {
    this.doorOpen = !this.doorOpen;
    this.tweens.add({
      targets: this.doorPanel,
      y: this.doorOpen ? 558 : 592,
      scaleY: this.doorOpen ? 0.18 : 1,
      duration: 420,
      ease: "Sine.InOut",
    });
  }
}

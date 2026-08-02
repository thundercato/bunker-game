import Phaser from "phaser";

const VERSION = "0.2.00";
const PLAYER_SPEED = 190;
const KNIFE_SPEED = 720;
const MAX_SHARPNESS = 50;

type RoomId = "quarters" | "corridor" | "kill" | "locked-a" | "locked-b";
type KnifeState = "rack" | "held" | "flying" | "ground" | "stuck-wall" | "stuck-target";

type Target = {
  body: Phaser.GameObjects.Container;
  active: boolean;
  timer: number;
};

export class KnifeTrainingScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private knife!: Phaser.GameObjects.Container;
  private knifeState: KnifeState = "rack";
  private sharpness = MAX_SHARPNESS;
  private facing = new Phaser.Math.Vector2(0, 1);
  private room: RoomId = "quarters";
  private targets: Target[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private weaponHud!: Phaser.GameObjects.Text;
  private activation!: Phaser.GameObjects.Container;
  private previousButtons = [false, false, false, false];
  private throwVelocity = new Phaser.Math.Vector2();
  private throwDistance = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  public constructor() {
    super("KnifeTraining");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#05080b");
    this.drawMap();
    this.createPlayer();
    this.createKnife();
    this.createTargets();
    this.createHud();
    this.createActivationGate();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input unavailable");
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D,E,X,Q,F,SPACE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
  }

  public update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const pad = this.getGamepad();
    const move = this.readMove(pad);
    this.updateFacing(move, pad);
    this.movePlayer(move, dt);
    this.updateKnife(dt);
    this.updateTargets(delta);
    this.updateRoom();

    const interact = this.buttonPressed(2, pad) || Boolean(this.keys.E.isDown);
    const stab = this.buttonPressed(0, pad) || Boolean(this.keys.F.isDown);
    const throwKnife = this.buttonPressed(3, pad) || Boolean(this.keys.Q.isDown);

    if (interact) this.handleInteract();
    if (stab) this.stab();
    if (throwKnife) this.throwKnife();

    this.updatePrompt();
    this.updateHud();
    this.previousButtons = [0, 1, 2, 3].map((index) =>
      Boolean(pad?.buttons[index]?.pressed),
    );
  }

  private drawMap(): void {
    const g = this.add.graphics();
    g.fillStyle(0x06090c).fillRect(0, 0, 1280, 720);

    this.roomBox(g, 45, 55, 500, 420, 0x151d23, "LIVING QUARTERS");
    this.roomBox(g, 575, 55, 210, 610, 0x11171c, "CORRIDOR");
    this.roomBox(g, 815, 310, 420, 355, 0x171b18, "KILL ROOM");
    this.roomBox(g, 815, 55, 190, 190, 0x10151a, "LOCKED");
    this.roomBox(g, 1045, 55, 190, 190, 0x10151a, "LOCKED");

    this.drawBed(g, 85, 105);
    this.drawBench(g, 335, 105);
    this.drawStorage(g, 85, 330);
    this.drawCooker(g, 355, 320);

    for (let y = 105; y < 630; y += 78) {
      this.wallLight(g, 600, y);
      this.wallLight(g, 760, y);
    }

    this.door(g, 540, 235, false, "OPEN");
    this.door(g, 785, 120, true, "LOCKED");
    this.door(g, 785, 210, true, "LOCKED");
    this.door(g, 785, 430, false, "TARGET ROOM");

    g.fillStyle(0x3a2a1a).fillRect(850, 585, 340, 24);
    g.lineStyle(3, 0x6b4b2b).strokeRect(850, 585, 340, 24);
    this.add.text(930, 620, "TRAINING BAY 01", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#a99777",
    });
  }

  private roomBox(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    colour: number,
    label: string,
  ): void {
    g.fillStyle(colour).fillRoundedRect(x, y, width, height, 14);
    g.lineStyle(7, 0x303941).strokeRoundedRect(x, y, width, height, 14);
    g.lineStyle(2, 0x53606a).strokeRoundedRect(
      x + 10,
      y + 10,
      width - 20,
      height - 20,
      9,
    );
    this.add.text(x + 16, y + 14, label, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#76838c",
    });
  }

  private drawBed(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x4c3020).fillRoundedRect(x, y, 185, 155, 7);
    g.fillStyle(0x314533).fillRoundedRect(x + 10, y + 42, 165, 102, 4);
    g.fillStyle(0xb0a79c).fillRoundedRect(x + 10, y + 10, 165, 45, 6);
  }

  private drawBench(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x563a24).fillRoundedRect(x, y + 35, 170, 140, 6);
    g.fillStyle(0x2e3d2f).fillRoundedRect(x + 18, y + 5, 75, 42, 5);
    g.fillStyle(0x8f9493).fillTriangle(
      x + 105,
      y + 18,
      x + 150,
      y + 30,
      x + 105,
      y + 42,
    );
    g.fillStyle(0x7e3829).fillRect(x + 145, y + 25, 20, 10);
  }

  private drawStorage(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x2b3e2d).fillRoundedRect(x, y, 185, 95, 7);
    g.lineStyle(4, 0x101711).strokeRoundedRect(x, y, 185, 95, 7);
    g.fillStyle(0x8b7a51).fillRect(x + 82, y + 40, 22, 13);
  }

  private drawCooker(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x484d50).fillRoundedRect(x, y, 145, 110, 6);
    g.fillStyle(0x171b1d).fillCircle(x + 42, y + 40, 25);
    g.fillStyle(0x8b5c2d).fillEllipse(x + 42, y + 37, 28, 10);
  }

  private wallLight(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x6b542e, 0.22).fillCircle(x, y, 46);
    g.fillStyle(0xf4c66a).fillRoundedRect(x - 13, y - 4, 26, 8, 3);
  }

  private door(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    locked: boolean,
    label: string,
  ): void {
    g.fillStyle(locked ? 0x2c2424 : 0x243029).fillRect(x, y, 40, 70);
    g.lineStyle(4, locked ? 0x6c3434 : 0x42644b).strokeRect(x, y, 40, 70);
    this.add.text(x - 4, y + 76, label, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: locked ? "#df6969" : "#75d98b",
    });
  }

  private createPlayer(): void {
    const g = this.add.graphics();
    g.fillStyle(0x2a3035).fillCircle(0, -13, 10);
    g.fillStyle(0x36523c).fillRoundedRect(-12, -3, 24, 30, 6);
    g.fillStyle(0x1d2428).fillRect(-10, 26, 7, 15);
    g.fillRect(3, 26, 7, 15);
    this.player = this.add.container(285, 290, [g]);
  }

  private createKnife(): void {
    const g = this.add.graphics();
    g.fillStyle(0x9da3a5).fillTriangle(-22, 0, 10, -7, 10, 7);
    g.fillStyle(0x6d3025).fillRoundedRect(8, -6, 25, 12, 4);
    this.knife = this.add.container(430, 145, [g]);
    this.knife.setRotation(0);
  }

  private createTargets(): void {
    for (const [x, y] of [
      [900, 430],
      [1025, 430],
      [1145, 430],
    ] as Array<[number, number]>) {
      const g = this.add.graphics();
      g.fillStyle(0x8d6338).fillCircle(0, -28, 22);
      g.fillStyle(0x714b2d).fillRoundedRect(-24, -8, 48, 78, 12);
      g.lineStyle(4, 0x2b1a10).strokeCircle(0, -28, 22);
      g.strokeRoundedRect(-24, -8, 48, 78, 12);
      g.fillStyle(0xb64235).fillCircle(0, 15, 12);
      const body = this.add.container(x, y + 130, [g]);
      this.targets.push({ body, active: false, timer: Phaser.Math.Between(900, 2500) });
    }
  }

  private createHud(): void {
    this.panel(18, 18, 245, 122);
    this.add.text(34, 32, "DAY 1   08:23", {
      fontFamily: "monospace",
      fontSize: "19px",
      color: "#58df70",
    });
    this.status = this.add.text(34, 68, "QUARTERS\nFIND THE KNIFE", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d7dde1",
      lineSpacing: 7,
    });

    this.panel(965, 18, 295, 122);
    this.weaponHud = this.add.text(983, 34, "KNIFE: ON RACK\nSHARPNESS: 50/50\nA STAB   X INTERACT   Y THROW", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d7dde1",
      lineSpacing: 7,
    });

    this.prompt = this.add
      .text(640, 680, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#05080bee",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add.text(1110, 690, `v${VERSION}`, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#65717a",
    });
  }

  private panel(x: number, y: number, width: number, height: number): void {
    const panel = this.add.rectangle(x, y, width, height, 0x05080b, 0.94).setOrigin(0);
    panel.setStrokeStyle(2, 0x39434b);
  }

  private createActivationGate(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.78);
    const button = this.add.rectangle(640, 360, 400, 120, 0x17351e);
    button.setStrokeStyle(3, 0x59dd72);
    const text = this.add
      .text(640, 345, "TAP TO ENTER", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#6ff087",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const help = this.add
      .text(640, 390, "Activates controller and audio", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#d9e4dc",
      })
      .setOrigin(0.5);
    this.activation = this.add.container(0, 0, [shade, button, text, help]).setDepth(100);
    button.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      navigator.getGamepads();
      this.activation.destroy();
    });
  }

  private readMove(pad: Gamepad | null): Phaser.Math.Vector2 {
    const keyboardX =
      (this.cursors.left.isDown ? -1 : 0) +
      (this.cursors.right.isDown ? 1 : 0) +
      (this.keys.A.isDown ? -1 : 0) +
      (this.keys.D.isDown ? 1 : 0);
    const keyboardY =
      (this.cursors.up.isDown ? -1 : 0) +
      (this.cursors.down.isDown ? 1 : 0) +
      (this.keys.W.isDown ? -1 : 0) +
      (this.keys.S.isDown ? 1 : 0);
    const px = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? (pad?.axes[0] ?? 0) : 0;
    const py = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? (pad?.axes[1] ?? 0) : 0;
    return new Phaser.Math.Vector2(px || keyboardX, py || keyboardY).limit(1);
  }

  private updateFacing(move: Phaser.Math.Vector2, pad: Gamepad | null): void {
    const rx = pad?.axes[2] ?? 0;
    const ry = pad?.axes[3] ?? 0;
    if (Math.hypot(rx, ry) > 0.25) this.facing.set(rx, ry).normalize();
    else if (move.lengthSq() > 0.02) this.facing.copy(move).normalize();
    this.player.setRotation(this.facing.angle() + Math.PI / 2);
  }

  private movePlayer(move: Phaser.Math.Vector2, dt: number): void {
    if (move.lengthSq() === 0) return;
    const nextX = this.player.x + move.x * PLAYER_SPEED * dt;
    const nextY = this.player.y + move.y * PLAYER_SPEED * dt;

    if (this.room === "quarters") {
      this.player.x = Phaser.Math.Clamp(nextX, 72, 555);
      this.player.y = Phaser.Math.Clamp(nextY, 82, 448);
      if (this.player.x > 520 && this.player.y > 200 && this.player.y < 320) {
        this.player.x = nextX;
      }
    } else if (this.room === "corridor") {
      this.player.x = Phaser.Math.Clamp(nextX, 595, 770);
      this.player.y = Phaser.Math.Clamp(nextY, 82, 640);
      if (this.player.x > 750 && this.player.y > 390 && this.player.y < 510) {
        this.player.x = nextX;
      }
    } else if (this.room === "kill") {
      this.player.x = Phaser.Math.Clamp(nextX, 795, 1210);
      this.player.y = Phaser.Math.Clamp(nextY, 335, 635);
    }
  }

  private updateRoom(): void {
    if (this.room === "quarters" && this.player.x > 560) this.room = "corridor";
    if (this.room === "corridor" && this.player.x < 565 && this.player.y < 330)
      this.room = "quarters";
    if (this.room === "corridor" && this.player.x > 790 && this.player.y > 380)
      this.room = "kill";
    if (this.room === "kill" && this.player.x < 800) this.room = "corridor";
  }

  private handleInteract(): void {
    if (this.knifeState !== "held" && this.distanceToKnife() < 68) {
      this.knifeState = "held";
      this.knife.setVisible(false);
      return;
    }

    if (this.room === "corridor" && this.player.x > 735 && this.player.y < 300) {
      this.flashMessage("DOOR LOCKED");
      return;
    }

    if (this.room === "quarters" && Phaser.Math.Distance.Between(this.player.x, this.player.y, 430, 150) < 90) {
      this.flashMessage(this.knifeState === "rack" ? "TAKE THE KNIFE" : "WEAPON STATION EMPTY");
      if (this.knifeState === "rack") {
        this.knifeState = "held";
        this.knife.setVisible(false);
      }
    }
  }

  private stab(): void {
    if (this.knifeState !== "held" || this.sharpness <= 0) return;
    const tipX = this.player.x + this.facing.x * 60;
    const tipY = this.player.y + this.facing.y * 60;
    const hit = this.targets.find(
      (target) => target.active && Phaser.Math.Distance.Between(tipX, tipY, target.body.x, target.body.y) < 50,
    );
    this.sharpness = Math.max(0, this.sharpness - 1);
    this.tweens.add({ targets: this.player, x: this.player.x + this.facing.x * 15, y: this.player.y + this.facing.y * 15, yoyo: true, duration: 80 });
    if (hit) {
      hit.active = false;
      hit.timer = Phaser.Math.Between(900, 2200);
      this.tweens.add({ targets: hit.body, y: hit.body.y + 130, duration: 140 });
      this.flashMessage("TARGET HIT  -1 SHARPNESS");
    } else {
      this.flashMessage("STAB MISSED  -1 SHARPNESS");
    }
  }

  private throwKnife(): void {
    if (this.knifeState !== "held" || this.sharpness <= 0) return;
    this.knifeState = "flying";
    this.knife.setVisible(true).setPosition(this.player.x, this.player.y);
    this.knife.setRotation(this.facing.angle());
    this.throwVelocity.copy(this.facing).scale(KNIFE_SPEED);
    this.throwDistance = 0;
  }

  private updateKnife(dt: number): void {
    if (this.knifeState !== "flying") return;
    const dx = this.throwVelocity.x * dt;
    const dy = this.throwVelocity.y * dt;
    this.knife.x += dx;
    this.knife.y += dy;
    this.throwDistance += Math.hypot(dx, dy);

    const target = this.targets.find(
      (entry) => entry.active && Phaser.Math.Distance.Between(this.knife.x, this.knife.y, entry.body.x, entry.body.y) < 42,
    );
    if (target) {
      target.active = false;
      target.timer = Phaser.Math.Between(900, 2200);
      this.tweens.add({ targets: target.body, y: target.body.y + 130, duration: 140 });
      this.knifeState = "stuck-target";
      this.sharpness = Math.max(0, this.sharpness - 1);
      this.flashMessage("KNIFE STUCK IN TARGET  -1 SHARPNESS");
      return;
    }

    const wall = this.knife.x < 55 || this.knife.x > 1225 || this.knife.y < 65 || this.knife.y > 655;
    if (wall) {
      this.knifeState = "stuck-wall";
      this.sharpness = Math.max(0, this.sharpness - 3);
      this.flashMessage("KNIFE HIT WALL  -3 SHARPNESS");
      return;
    }

    if (this.throwDistance > 920) {
      this.knifeState = "ground";
      this.sharpness = Math.max(0, this.sharpness - 3);
      this.knife.setRotation(0.3);
      this.flashMessage("KNIFE FELL  -3 SHARPNESS");
    }
  }

  private updateTargets(delta: number): void {
    if (this.room !== "kill") return;
    for (const target of this.targets) {
      if (target.active) continue;
      target.timer -= delta;
      if (target.timer <= 0) {
        target.active = true;
        target.body.y -= 130;
      }
    }
  }

  private updatePrompt(): void {
    let text = "";
    if (this.knifeState !== "held" && this.distanceToKnife() < 75) text = "X  PICK UP KNIFE";
    else if (this.room === "quarters" && Phaser.Math.Distance.Between(this.player.x, this.player.y, 430, 150) < 95)
      text = this.knifeState === "rack" ? "X  TAKE KNIFE" : "WEAPON STATION";
    else if (this.room === "corridor" && this.player.x > 720 && this.player.y < 300)
      text = "X  TRY LOCKED DOOR";
    else if (this.room === "kill") text = "A STAB    Y THROW    X PICK UP";
    this.prompt.setText(text).setVisible(text.length > 0);
  }

  private updateHud(): void {
    this.status.setText(`${this.room.toUpperCase()}\n${this.room === "kill" ? "TARGETS ACTIVE" : "FIND THE TARGET ROOM"}`);
    const state = this.knifeState.replace("-", " ").toUpperCase();
    this.weaponHud.setText(`KNIFE: ${state}\nSHARPNESS: ${this.sharpness}/${MAX_SHARPNESS}\nA STAB   X INTERACT   Y THROW`);
  }

  private flashMessage(message: string): void {
    this.prompt.setText(message).setVisible(true);
    this.time.delayedCall(900, () => this.updatePrompt());
  }

  private distanceToKnife(): number {
    if (this.knifeState === "held" || this.knifeState === "rack") return Number.POSITIVE_INFINITY;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.knife.x, this.knife.y);
  }

  private getGamepad(): Gamepad | null {
    return Array.from(navigator.getGamepads()).find((pad) => pad !== null) ?? null;
  }

  private buttonPressed(index: number, pad: Gamepad | null): boolean {
    const down = Boolean(pad?.buttons[index]?.pressed);
    return down && !this.previousButtons[index];
  }
}

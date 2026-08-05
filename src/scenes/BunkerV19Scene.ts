import Phaser from "phaser";
import { BunkerV18Scene } from "./BunkerV18Scene";

type EnemyKind = "spider" | "rat";
type EnemyState = {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: EnemyKind;
  health: number;
  nextTurnAt: number;
};

type Runtime = {
  uiOpen: boolean;
};

const CELL = 64;
const COLS = 25;
const ROWS = 17;
const WALL = 18;
const DOOR_RANGE = 76;
const EXIT_RANGE = 70;

export class BunkerV19Scene extends BunkerV18Scene {
  private entranceDoor!: Phaser.GameObjects.Container;
  private entrancePrompt!: Phaser.GameObjects.Text;
  private tunnelRoot?: Phaser.GameObjects.Container;
  private tunnelWalls?: Phaser.Physics.Arcade.StaticGroup;
  private tunnelCollider?: Phaser.Physics.Arcade.Collider;
  private exitMarker?: Phaser.GameObjects.Container;
  private exitPrompt?: Phaser.GameObjects.Text;
  private enemies: EnemyState[] = [];
  private player?: Phaser.Physics.Arcade.Sprite;
  private inTunnels = false;
  private tunnelOrigin = new Phaser.Math.Vector2(0, 0);
  private lastFacing = new Phaser.Math.Vector2(0, 1);
  private useHeld = false;
  private stabHeld = false;

  public override create(): void {
    super.create();
    this.player = this.findPlayer();
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
    super.update(time, delta);
    const player = this.player ?? this.findPlayer();
    if (!player) return;
    this.player = player;

    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.lengthSq() > 4) {
      this.lastFacing.set(body.velocity.x, body.velocity.y).normalize();
    }

    const gamepad = navigator.getGamepads()[0];
    const usePressed =
      (this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown ??
        false) ||
      (gamepad?.buttons[2]?.pressed ?? false);
    if (usePressed && !this.useHeld && !this.runtimeV19().uiOpen) {
      if (this.inTunnels && this.nearExit(player)) this.completeDemo();
      else if (!this.inTunnels && this.nearEntrance(player))
        this.enterTunnels();
    }
    this.useHeld = usePressed;

    const stabPressed = gamepad?.buttons[0]?.pressed ?? false;
    if (this.inTunnels && stabPressed && !this.stabHeld) this.tryStab();
    this.stabHeld = stabPressed;

    this.entrancePrompt.setVisible(
      !this.inTunnels && !this.runtimeV19().uiOpen && this.nearEntrance(player),
    );
    this.exitPrompt?.setVisible(
      this.inTunnels && !this.runtimeV19().uiOpen && this.nearExit(player),
    );
    if (this.inTunnels) this.updateEnemies(time, delta);
  }

  private runtimeV19(): Runtime {
    return this as unknown as Runtime;
  }

  private findPlayer(): Phaser.Physics.Arcade.Sprite | undefined {
    return this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite &&
        child.texture.key.startsWith("survivor-"),
    );
  }

  private createEntranceDoor(): void {
    const bounds = this.physics.world.bounds;
    const x = bounds.centerX;
    const y = bounds.bottom - 42;
    const frame = this.add
      .rectangle(0, 0, 70, 18, 0x182128)
      .setStrokeStyle(3, 0x77848a);
    const hatch = this.add
      .rectangle(0, -4, 50, 12, 0x3e4b50)
      .setStrokeStyle(2, 0x101619);
    const lamp = this.add.circle(0, -17, 4, 0x98d87a).setAlpha(0.75);
    this.entranceDoor = this.add
      .container(x, y, [frame, hatch, lamp])
      .setDepth(20);
    this.entrancePrompt = this.add
      .text(x, y - 34, "USE · ENTER TUNNELS", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e0f3e5",
        backgroundColor: "#07100ddd",
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);
  }

  private nearEntrance(player: Phaser.Physics.Arcade.Sprite): boolean {
    return (
      Phaser.Math.Distance.Between(
        player.x,
        player.y,
        this.entranceDoor.x,
        this.entranceDoor.y,
      ) <= DOOR_RANGE
    );
  }

  private nearExit(player: Phaser.Physics.Arcade.Sprite): boolean {
    if (!this.exitMarker) return false;
    return (
      Phaser.Math.Distance.Between(
        player.x,
        player.y,
        this.exitMarker.x,
        this.exitMarker.y,
      ) <= EXIT_RANGE
    );
  }

  private enterTunnels(): void {
    const player = this.player;
    if (!player) return;
    this.destroyTunnel();
    this.inTunnels = true;
    const world = this.physics.world.bounds;
    this.tunnelOrigin.set(world.right + 640, world.top + 320);
    this.generateTunnel();
    player.setPosition(
      this.tunnelOrigin.x + CELL * 1.5,
      this.tunnelOrigin.y + CELL * 1.5,
    );
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.cameras.main.startFollow(player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.toast("THE HATCH CLANGS SHUT BEHIND YOU");
  }

  private generateTunnel(): void {
    const grid = Array.from(
      { length: ROWS },
      () => Array(COLS).fill(true) as boolean[],
    );
    const stack: Array<[number, number]> = [[1, 1]];
    grid[1]![1] = false;
    const directions: Array<[number, number]> = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ];
    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1]!;
      const choices = directions
        .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy] as const)
        .filter(
          ([nx, ny]) =>
            nx > 0 && ny > 0 && nx < COLS - 1 && ny < ROWS - 1 && grid[ny]![nx],
        );
      if (choices.length === 0) {
        stack.pop();
        continue;
      }
      const [nx, ny, dx, dy] = Phaser.Utils.Array.GetRandom(choices);
      grid[cy + dy / 2]![cx + dx / 2] = false;
      grid[ny]![nx] = false;
      stack.push([nx, ny]);
    }

    const root = this.add.container(0, 0).setDepth(1);
    this.tunnelRoot = root;
    this.tunnelWalls = this.physics.add.staticGroup();
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const wx = this.tunnelOrigin.x + x * CELL + CELL / 2;
        const wy = this.tunnelOrigin.y + y * CELL + CELL / 2;
        if (grid[y]![x]) {
          const wall = this.add
            .rectangle(wx, wy, CELL, CELL, 0x202629)
            .setStrokeStyle(1, 0x343d40)
            .setDepth(3);
          this.physics.add.existing(wall, true);
          this.tunnelWalls.add(wall);
          root.add(wall);
        } else {
          root.add(
            this.add
              .rectangle(wx, wy, CELL, CELL, 0x0c1113)
              .setStrokeStyle(1, 0x151d20)
              .setDepth(1),
          );
        }
      }
    }
    if (this.player)
      this.tunnelCollider = this.physics.add.collider(
        this.player,
        this.tunnelWalls,
      );

    const exitCell = this.farthestOpenCell(grid, 1, 1);
    const exitX = this.tunnelOrigin.x + exitCell.x * CELL + CELL / 2;
    const exitY = this.tunnelOrigin.y + exitCell.y * CELL + CELL / 2;
    const exitDoor = this.add
      .rectangle(0, 0, 42, 42, 0x495a50)
      .setStrokeStyle(3, 0xb5c59f);
    const exitLamp = this.add.circle(0, -28, 5, 0xb4ff8a);
    this.exitMarker = this.add
      .container(exitX, exitY, [exitDoor, exitLamp])
      .setDepth(12);
    this.exitPrompt = this.add
      .text(exitX, exitY - 48, "USE · LEAVE TUNNELS", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#edffe6",
        backgroundColor: "#07100ddd",
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);
    root.add([this.exitMarker, this.exitPrompt]);

    const openCells: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < ROWS - 1; y += 1)
      for (let x = 1; x < COLS - 1; x += 1)
        if (
          !grid[y]![x] &&
          (x !== 1 || y !== 1) &&
          (x !== exitCell.x || y !== exitCell.y)
        )
          openCells.push({ x, y });
    Phaser.Utils.Array.Shuffle(openCells);
    const enemyCount = Phaser.Math.Between(10, 16);
    for (const cell of openCells.slice(0, enemyCount))
      this.spawnEnemy(cell.x, cell.y);
  }

  private farthestOpenCell(
    grid: boolean[][],
    sx: number,
    sy: number,
  ): { x: number; y: number } {
    const queue: Array<{ x: number; y: number; distance: number }> = [
      { x: sx, y: sy, distance: 0 },
    ];
    const seen = new Set([`${sx},${sy}`]);
    let farthest = queue[0]!;
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.distance > farthest.distance) farthest = current;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= COLS ||
          ny >= ROWS ||
          grid[ny]![nx] ||
          seen.has(key)
        )
          continue;
        seen.add(key);
        queue.push({ x: nx, y: ny, distance: current.distance + 1 });
      }
    }
    return { x: farthest.x, y: farthest.y };
  }

  private spawnEnemy(cellX: number, cellY: number): void {
    const kind: EnemyKind = Math.random() < 0.55 ? "spider" : "rat";
    const x = this.tunnelOrigin.x + cellX * CELL + CELL / 2;
    const y = this.tunnelOrigin.y + cellY * CELL + CELL / 2;
    const key = `tunnel-${kind}`;
    if (!this.textures.exists(key)) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(kind === "spider" ? 0x17110f : 0x6f6258, 1);
      graphics.fillEllipse(
        16,
        16,
        kind === "spider" ? 18 : 25,
        kind === "spider" ? 13 : 12,
      );
      if (kind === "spider") {
        graphics.lineStyle(2, 0x2b211d, 1);
        for (const side of [-1, 1])
          for (const offset of [-6, -2, 2, 6])
            graphics.lineBetween(
              16 + side * 6,
              16 + offset,
              16 + side * 14,
              16 + offset * 1.6,
            );
      } else {
        graphics.fillTriangle(4, 13, 10, 8, 11, 16);
        graphics.lineStyle(2, 0x9a8271, 1).lineBetween(28, 17, 35, 13);
      }
      graphics.generateTexture(key, 36, 32);
      graphics.destroy();
    }
    const sprite = this.physics.add.sprite(x, y, key).setDepth(9);
    sprite.setCollideWorldBounds(false);
    (sprite.body as Phaser.Physics.Arcade.Body).setSize(24, 16).setOffset(6, 9);
    if (this.tunnelWalls) this.physics.add.collider(sprite, this.tunnelWalls);
    this.enemies.push({ sprite, kind, health: 2, nextTurnAt: 0 });
  }

  private updateEnemies(time: number, _delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) continue;
      if (time >= enemy.nextTurnAt) {
        enemy.nextTurnAt = time + Phaser.Math.Between(550, 1450);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = enemy.kind === "rat" ? 42 : 30;
        enemy.sprite.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
        );
      }
    }
  }

  private readonly onGunshot = (): void => {
    if (!this.inTunnels || !this.player) return;
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const direction = this.lastFacing.clone().normalize();
    let best: EnemyState | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) continue;
      const offset = new Phaser.Math.Vector2(
        enemy.sprite.x - origin.x,
        enemy.sprite.y - origin.y,
      );
      const forward = offset.dot(direction);
      if (forward <= 0 || forward > 700) continue;
      const lateral = Math.abs(offset.x * direction.y - offset.y * direction.x);
      if (lateral <= 18 && forward < bestDistance) {
        best = enemy;
        bestDistance = forward;
      }
    }
    if (best) this.damageEnemy(best, 2);
  };

  private readonly onTouchAttack = (): void => {
    if (this.inTunnels) window.setTimeout(() => this.tryStab(), 0);
  };

  private tryStab(): void {
    if (!this.inTunnels || !this.player) return;
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const direction = this.lastFacing.clone().normalize();
    const target = this.enemies
      .filter((enemy) => enemy.sprite.active)
      .map((enemy) => ({
        enemy,
        offset: new Phaser.Math.Vector2(
          enemy.sprite.x - origin.x,
          enemy.sprite.y - origin.y,
        ),
      }))
      .filter(
        ({ offset }) => offset.length() <= 58 && offset.dot(direction) > 0,
      )
      .sort((a, b) => a.offset.lengthSq() - b.offset.lengthSq())[0]?.enemy;
    if (target) this.damageEnemy(target, 1);
  }

  private damageEnemy(enemy: EnemyState, amount: number): void {
    enemy.health -= amount;
    enemy.sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => enemy.sprite.clearTint());
    if (enemy.health > 0) return;
    enemy.sprite.disableBody(true, true);
    this.toast(`${enemy.kind.toUpperCase()} KILLED`);
  }

  private completeDemo(): void {
    const overlay = document.querySelector<HTMLElement>(".game-overlay");
    if (!overlay) return;
    this.runtimeV19().uiOpen = true;
    overlay.classList.add("is-open");
    const panel = document.createElement("div");
    panel.className = "message-panel demo-complete";
    panel.innerHTML = `<h2>DEMO COMPLETE</h2><p>You found the tunnel exit.</p><p>The bunker continues beyond this point.</p><button>RETURN TO BUNKER</button>`;
    panel.querySelector("button")?.addEventListener("click", () => {
      overlay.classList.remove("is-open");
      overlay.replaceChildren();
      this.runtimeV19().uiOpen = false;
      this.leaveTunnels();
    });
    overlay.replaceChildren(panel);
  }

  private leaveTunnels(): void {
    const player = this.player;
    if (!player) return;
    this.inTunnels = false;
    player.setPosition(this.entranceDoor.x, this.entranceDoor.y - 90);
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.destroyTunnel();
    this.cameras.main.startFollow(player, true, 0.12, 0.12);
  }

  private destroyTunnel(): void {
    this.tunnelCollider?.destroy();
    this.tunnelCollider = undefined;
    for (const enemy of this.enemies) enemy.sprite.destroy();
    this.enemies = [];
    this.tunnelWalls?.clear(true, true);
    this.tunnelWalls = undefined;
    this.tunnelRoot?.destroy(true);
    this.tunnelRoot = undefined;
    this.exitMarker = undefined;
    this.exitPrompt = undefined;
  }

  private toast(message: string): void {
    window.dispatchEvent(
      new CustomEvent("bunker-toast", { detail: { message } }),
    );
    const toast = document.createElement("div");
    toast.className = "inventory-toast survival-toast";
    toast.textContent = message;
    document.querySelector("#app")?.append(toast);
    window.setTimeout(() => toast.remove(), 1700);
  }
}

import Phaser from "phaser";
import { BunkerV18Scene } from "./BunkerV18Scene";
import {
  LABYRINTH_VISIBILITY_RADIUS,
  ROOM_VISIBILITY_RADIUS,
  generateLabyrinth,
  type ExplorationDoor,
  type ExplorationRoomState,
  type FurnitureKind,
  type LabyrinthRunState,
  validateLabyrinth,
} from "@/labyrinth/LabyrinthModel";

type RuntimeV29 = {
  uiOpen: boolean;
  health: number;
  emitState: () => void;
  knifeLocation: "storage" | "backpack" | "armed" | "world";
};
type EnemyV29 = {
  sprite: Phaser.Physics.Arcade.Sprite;
  health: number;
  nextTurnAt: number;
};
type DoorView = {
  state: ExplorationDoor;
  sprite: Phaser.GameObjects.Container;
  prompt: Phaser.GameObjects.Text;
};

const CELL = 48;
const INTERACT_RANGE = 72;
const FADE_MS = 450;
const ENEMY_DAMAGE = 12;

export class BunkerV29Scene extends BunkerV18Scene {
  private labyrinth?: LabyrinthRunState;
  private labyrinthRoot?: Phaser.GameObjects.Container;
  private roomRoot?: Phaser.GameObjects.Container;
  private labyrinthWalls?: Phaser.Physics.Arcade.StaticGroup;
  private roomWalls?: Phaser.Physics.Arcade.StaticGroup;
  private labyrinthCollider?: Phaser.Physics.Arcade.Collider;
  private roomCollider?: Phaser.Physics.Arcade.Collider;
  private tunnelPlayer?: Phaser.Physics.Arcade.Sprite;
  private entranceDoor?: Phaser.GameObjects.Container;
  private entrancePrompt?: Phaser.GameObjects.Text;
  private roomExitDoor?: Phaser.GameObjects.Container;
  private roomExitPrompt?: Phaser.GameObjects.Text;
  private explorationDoors: DoorView[] = [];
  private enemies: EnemyV29[] = [];
  private inLabyrinth = false;
  private inRoom = false;
  private activeRoom?: ExplorationRoomState;
  private activeDoor?: ExplorationDoor;
  private returnPosition = new Phaser.Math.Vector2();
  private useHeld = false;
  private transitionLocked = false;
  private damageLockedUntil = 0;
  private lighting?: Phaser.GameObjects.RenderTexture;
  private lightingBrush?: Phaser.GameObjects.Graphics;
  private labyrinthOrigin = new Phaser.Math.Vector2();
  private originalWorldBounds?: Phaser.Geom.Rectangle;

  public override create(): void {
    super.create();
    this.tunnelPlayer = this.findTunnelPlayer();
    this.originalWorldBounds = new Phaser.Geom.Rectangle(
      this.physics.world.bounds.x,
      this.physics.world.bounds.y,
      this.physics.world.bounds.width,
      this.physics.world.bounds.height,
    );
    this.createBunkerEntrance();
    window.addEventListener("bunker-gunshot", this.onGunshot);
    window.addEventListener("bunker-touch-attack", this.onTouchAttack);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyV29());
    this.game.events.on(Phaser.Core.Events.BLUR, this.suspendLighting, this);
    this.game.events.on(Phaser.Core.Events.FOCUS, this.restoreLighting, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.restoreLighting, this);
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    const player = this.tunnelPlayer ?? this.findTunnelPlayer();
    if (!player) return;
    this.tunnelPlayer = player;
    if (this.transitionLocked) {
      player.setVelocity(0, 0);
      return;
    }

    const gamepad = navigator.getGamepads()[0];
    const usePressed =
      (this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown ?? false) ||
      (gamepad?.buttons[2]?.pressed ?? false);
    if (usePressed && !this.useHeld && !this.runtimeV29().uiOpen) {
      if (this.inRoom && this.near(this.roomExitDoor)) void this.exitRoom();
      else if (this.inLabyrinth && this.near(this.entranceDoor)) void this.leaveLabyrinth();
      else if (this.inLabyrinth) {
        const door = this.explorationDoors.find(({ sprite }) => this.near(sprite));
        if (door) void this.enterRoom(door.state);
      } else if (this.near(this.entranceDoor)) void this.enterLabyrinth();
    }
    this.useHeld = usePressed;

    this.entrancePrompt?.setVisible(
      !this.runtimeV29().uiOpen && this.near(this.entranceDoor),
    );
    this.roomExitPrompt?.setVisible(
      this.inRoom && !this.runtimeV29().uiOpen && this.near(this.roomExitDoor),
    );
    for (const door of this.explorationDoors)
      door.prompt.setVisible(
        this.inLabyrinth && !this.runtimeV29().uiOpen && this.near(door.sprite),
      );

    if (this.inLabyrinth) this.updateEnemies(time, delta);
    if (this.inLabyrinth || this.inRoom) this.updateLighting();
  }

  private runtimeV29(): RuntimeV29 {
    return this as unknown as RuntimeV29;
  }

  private findTunnelPlayer(): Phaser.Physics.Arcade.Sprite | undefined {
    return this.children.list.find(
      (child): child is Phaser.Physics.Arcade.Sprite =>
        child instanceof Phaser.Physics.Arcade.Sprite && child.texture.key.startsWith("survivor-"),
    );
  }

  private createBunkerEntrance(): void {
    const bounds = this.physics.world.bounds;
    const x = bounds.centerX;
    const y = bounds.bottom - 90;
    this.entranceDoor = this.makeDoor(x, y, 0x43545b, 0xa8bcc4);
    this.entrancePrompt = this.makePrompt(x, y - 38, "USE · ENTER LABYRINTH");
  }

  private makeDoor(
    x: number,
    y: number,
    fill: number,
    stroke: number,
  ): Phaser.GameObjects.Container {
    const frame = this.add.rectangle(0, 0, 58, 18, fill).setStrokeStyle(3, stroke);
    const handle = this.add.circle(18, 0, 3, 0xc6ad79);
    return this.add.container(x, y, [frame, handle]).setDepth(24);
  }

  private makePrompt(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e8f4eb",
        backgroundColor: "#07100ddd",
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setVisible(false);
  }

  private near(object?: Phaser.GameObjects.Components.Transform): boolean {
    const player = this.tunnelPlayer;
    if (!player || !object) return false;
    return Phaser.Math.Distance.Between(player.x, player.y, object.x, object.y) <= INTERACT_RANGE;
  }

  private async enterLabyrinth(): Promise<void> {
    if (this.transitionLocked || !this.tunnelPlayer) return;
    this.transitionLocked = true;
    this.clearInput();
    await this.fadeOut();
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    let state = generateLabyrinth(seed);
    const errors = validateLabyrinth(state);
    if (errors.length > 0) state = generateLabyrinth(0x29b00b5);
    this.labyrinth = state;
    this.buildLabyrinth(state);
    this.inLabyrinth = true;
    this.inRoom = false;
    this.tunnelPlayer.setPosition(
      this.labyrinthOrigin.x + state.spawn.x * CELL + CELL / 2,
      this.labyrinthOrigin.y + state.spawn.y * CELL + CELL / 2,
    );
    this.tunnelPlayer.setVelocity(0, 0);
    this.configureLabyrinthCamera();
    this.initialiseLighting();
    await this.fadeIn();
    this.transitionLocked = false;
  }

  private buildLabyrinth(state: LabyrinthRunState): void {
    this.destroyLabyrinthVisuals();
    const old = this.originalWorldBounds ?? this.physics.world.bounds;
    this.labyrinthOrigin.set(old.right + 700, old.top + 300);
    const root = this.add.container(0, 0).setDepth(1);
    this.labyrinthRoot = root;
    this.labyrinthWalls = this.physics.add.staticGroup();
    for (let y = 0; y < state.height; y += 1) {
      for (let x = 0; x < state.width; x += 1) {
        const wx = this.labyrinthOrigin.x + x * CELL + CELL / 2;
        const wy = this.labyrinthOrigin.y + y * CELL + CELL / 2;
        if (state.walls[y]![x]) {
          const wall = this.add
            .rectangle(wx, wy, CELL, CELL, 0x20282b)
            .setStrokeStyle(1, 0x394448)
            .setDepth(3);
          this.physics.add.existing(wall, true);
          this.labyrinthWalls.add(wall);
          root.add(wall);
        } else {
          const wet = (x * 17 + y * 31 + state.seed) % 7 === 0;
          root.add(
            this.add
              .rectangle(wx, wy, CELL, CELL, wet ? 0x172326 : 0x0d1416)
              .setStrokeStyle(1, wet ? 0x244044 : 0x172124)
              .setDepth(1),
          );
        }
      }
    }
    if (this.tunnelPlayer)
      this.labyrinthCollider = this.physics.add.collider(this.tunnelPlayer, this.labyrinthWalls);

    const entranceX = this.labyrinthOrigin.x + state.entrance.x * CELL + CELL / 2;
    const entranceY = this.labyrinthOrigin.y + state.entrance.y * CELL + CELL / 2;
    this.entranceDoor = this.makeDoor(entranceX, entranceY, 0x39535c, 0xa7c5cf);
    this.entrancePrompt = this.makePrompt(entranceX, entranceY - 38, "USE · RETURN TO BUNKER");
    root.add([this.entranceDoor, this.entrancePrompt]);

    this.explorationDoors = state.explorationDoors.map((door, index) => {
      const x = this.labyrinthOrigin.x + door.tile.x * CELL + CELL / 2;
      const y = this.labyrinthOrigin.y + door.tile.y * CELL + CELL / 2;
      const sprite = this.makeDoor(x, y, 0x4b3930, 0x8d7358);
      const prompt = this.makePrompt(x, y - 38, `USE · ENTER ROOM ${index + 1}`);
      root.add([sprite, prompt]);
      return { state: door, sprite, prompt };
    });

    const open: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < state.height - 1; y += 1)
      for (let x = 1; x < state.width - 1; x += 1)
        if (!state.walls[y]![x] && Phaser.Math.Distance.Between(x, y, state.spawn.x, state.spawn.y) > 6)
          open.push({ x, y });
    Phaser.Utils.Array.Shuffle(open);
    for (const tile of open.slice(0, 34)) this.spawnEnemy(tile.x, tile.y);
  }

  private configureLabyrinthCamera(): void {
    if (!this.labyrinth || !this.tunnelPlayer) return;
    const width = this.labyrinth.width * CELL;
    const height = this.labyrinth.height * CELL;
    this.physics.world.setBounds(this.labyrinthOrigin.x, this.labyrinthOrigin.y, width, height);
    this.cameras.main.setBounds(this.labyrinthOrigin.x, this.labyrinthOrigin.y, width, height);
    this.cameras.main.startFollow(this.tunnelPlayer, false, 1, 1);
    this.cameras.main.setZoom(1);
  }

  private async leaveLabyrinth(): Promise<void> {
    if (this.transitionLocked || !this.tunnelPlayer) return;
    this.transitionLocked = true;
    this.clearInput();
    await this.fadeOut();
    this.inLabyrinth = false;
    this.inRoom = false;
    this.destroyLabyrinthVisuals();
    this.destroyLighting();
    const bounds = this.originalWorldBounds;
    if (bounds) {
      this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
      this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
      this.tunnelPlayer.setPosition(bounds.centerX, bounds.bottom - 150);
    }
    this.cameras.main.startFollow(this.tunnelPlayer, true, 0.12, 0.12);
    await this.fadeIn();
    this.transitionLocked = false;
  }

  private async enterRoom(door: ExplorationDoor): Promise<void> {
    if (this.transitionLocked || !this.labyrinth || !this.tunnelPlayer) return;
    this.transitionLocked = true;
    this.clearInput();
    this.returnPosition.set(
      this.labyrinthOrigin.x + door.approach.x * CELL + CELL / 2,
      this.labyrinthOrigin.y + door.approach.y * CELL + CELL / 2,
    );
    this.activeDoor = door;
    this.labyrinth.currentDoorId = door.id;
    await this.fadeOut();
    this.inLabyrinth = false;
    this.inRoom = true;
    this.labyrinthRoot?.setVisible(false);
    for (const enemy of this.enemies) enemy.sprite.setActive(false).setVisible(false);
    this.activeRoom = this.labyrinth.roomStates[door.roomId];
    this.activeRoom.visited = true;
    this.buildRoom(this.activeRoom);
    await this.fadeIn();
    this.transitionLocked = false;
  }

  private buildRoom(room: ExplorationRoomState): void {
    this.destroyRoomVisuals();
    const root = this.add.container(0, 0).setDepth(2);
    this.roomRoot = root;
    this.roomWalls = this.physics.add.staticGroup();
    const worldWidth = room.width * CELL;
    const worldHeight = room.height * CELL;
    const x0 = this.labyrinthOrigin.x + 100;
    const y0 = this.labyrinthOrigin.y + 100;
    for (let y = 0; y < room.height; y += 1) {
      for (let x = 0; x < room.width; x += 1) {
        const wx = x0 + x * CELL + CELL / 2;
        const wy = y0 + y * CELL + CELL / 2;
        const isDoor = y === room.height - 1 && x === Math.floor(room.width / 2);
        const wall = x === 0 || y === 0 || x === room.width - 1 || y === room.height - 1;
        if (wall && !isDoor) {
          const block = this.add.rectangle(wx, wy, CELL, CELL, 0x303235).setStrokeStyle(1, 0x50545a);
          this.physics.add.existing(block, true);
          this.roomWalls.add(block);
          root.add(block);
        } else {
          root.add(this.add.rectangle(wx, wy, CELL, CELL, 0x17181a).setStrokeStyle(1, 0x232529));
        }
      }
    }
    const doorX = x0 + Math.floor(room.width / 2) * CELL + CELL / 2;
    const doorY = y0 + (room.height - 1) * CELL + CELL / 2;
    this.roomExitDoor = this.makeDoor(doorX, doorY, 0x4b3930, 0x8d7358);
    this.roomExitPrompt = this.makePrompt(doorX, doorY - 38, "USE · RETURN TO LABYRINTH");
    root.add([this.roomExitDoor, this.roomExitPrompt]);

    this.ensureFurnitureTextures();
    for (const furniture of room.furniture) {
      const x = x0 + furniture.tile.x * CELL + CELL / 2;
      const y = y0 + furniture.tile.y * CELL + CELL / 2;
      const image = this.add.image(x, y, `room-${furniture.kind}`).setDepth(7);
      image.setData("furniture-id", furniture.id);
      root.add(image);
      if (furniture.kind === "chest") {
        image.setInteractive({ useHandCursor: true });
        image.on("pointerdown", () => {
          this.toastV29(furniture.locked ? "CHEST LOCKED" : "CHEST OPENED");
          if (!furniture.locked) furniture.opened = true;
        });
      }
    }

    if (this.tunnelPlayer) {
      this.roomCollider = this.physics.add.collider(this.tunnelPlayer, this.roomWalls);
      this.tunnelPlayer.setPosition(doorX, doorY - CELL * 1.4);
      this.tunnelPlayer.setVelocity(0, 0);
    }
    this.physics.world.setBounds(x0, y0, worldWidth, worldHeight);
    const camera = this.cameras.main;
    camera.stopFollow();
    const padding = 36;
    const zoom = Math.min(
      camera.width / (worldWidth + padding * 2),
      camera.height / (worldHeight + padding * 2),
      1.35,
    );
    camera.setZoom(Math.max(0.72, zoom));
    camera.centerOn(x0 + worldWidth / 2, y0 + worldHeight / 2);
    this.initialiseLighting();
  }

  private async exitRoom(): Promise<void> {
    if (this.transitionLocked || !this.tunnelPlayer) return;
    this.transitionLocked = true;
    this.clearInput();
    await this.fadeOut();
    this.destroyRoomVisuals();
    this.inRoom = false;
    this.inLabyrinth = true;
    this.labyrinthRoot?.setVisible(true);
    for (const enemy of this.enemies) enemy.sprite.setActive(true).setVisible(true);
    this.tunnelPlayer.setPosition(this.returnPosition.x, this.returnPosition.y);
    this.tunnelPlayer.setVelocity(0, 0);
    this.configureLabyrinthCamera();
    this.initialiseLighting();
    await this.fadeIn();
    this.transitionLocked = false;
  }

  private ensureFurnitureTextures(): void {
    const make = (kind: FurnitureKind, colour: number, accent: number): void => {
      const key = `room-${kind}`;
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(colour).fillRoundedRect(2, 5, 44, 34, 4);
      g.lineStyle(2, accent).strokeRoundedRect(2, 5, 44, 34, 4);
      g.fillStyle(accent, 0.65).fillRect(7, 10, 34, 4);
      if (kind === "drawers") for (let y = 17; y < 35; y += 7) g.fillRect(8, y, 32, 2);
      if (kind === "cupboard") g.fillRect(23, 9, 2, 26);
      if (kind === "chest") g.fillStyle(0x9c7a3d).fillCircle(24, 25, 3);
      g.generateTexture(key, 48, 44);
      g.destroy();
    };
    make("desk", 0x58483d, 0x8b7562);
    make("drawers", 0x4d443d, 0x77695d);
    make("cupboard", 0x3d4a46, 0x687a73);
    make("chest", 0x4b3b2d, 0x8b6a45);
  }

  private initialiseLighting(): void {
    this.destroyLighting();
    const camera = this.cameras.main;
    this.lighting = this.add
      .renderTexture(0, 0, camera.width, camera.height)
      .setScrollFactor(0)
      .setDepth(900)
      .setOrigin(0);
    this.lightingBrush = this.make.graphics({ x: 0, y: 0 });
    this.updateLighting();
  }

  private updateLighting(): void {
    if (!this.lighting || !this.lightingBrush || !this.tunnelPlayer) return;
    const camera = this.cameras.main;
    if (this.lighting.width !== camera.width || this.lighting.height !== camera.height)
      this.initialiseLighting();
    const point = camera.getWorldPoint(this.tunnelPlayer.x, this.tunnelPlayer.y);
    const screenX = (point.x - camera.worldView.x) * camera.zoom;
    const screenY = (point.y - camera.worldView.y) * camera.zoom;
    const radius = (this.inRoom ? ROOM_VISIBILITY_RADIUS : LABYRINTH_VISIBILITY_RADIUS) * camera.zoom;
    this.lighting.clear();
    this.lighting.fill(0x000000, 0.94);
    this.lightingBrush.clear();
    for (let index = 8; index >= 1; index -= 1) {
      const alpha = 0.11 + (8 - index) * 0.015;
      this.lightingBrush.fillStyle(0xffffff, alpha);
      this.lightingBrush.fillCircle(screenX, screenY, (radius * index) / 8);
    }
    this.lightingBrush.setBlendMode(Phaser.BlendModes.ERASE);
    this.lighting.draw(this.lightingBrush);
  }

  private suspendLighting(): void {
    this.lighting?.setVisible(false);
  }
  private restoreLighting(): void {
    if (this.inLabyrinth || this.inRoom) this.initialiseLighting();
  }
  private destroyLighting(): void {
    this.lighting?.destroy();
    this.lightingBrush?.destroy();
    this.lighting = undefined;
    this.lightingBrush = undefined;
  }

  private spawnEnemy(tileX: number, tileY: number): void {
    const kind = Math.random() < 0.55 ? "spider" : "rat";
    const texture = `v29-${kind}`;
    if (!this.textures.exists(texture)) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(kind === "spider" ? 0x18100f : 0x6f6258).fillEllipse(16, 16, kind === "spider" ? 18 : 25, 13);
      g.generateTexture(texture, 32, 32);
      g.destroy();
    }
    const sprite = this.physics.add.sprite(
      this.labyrinthOrigin.x + tileX * CELL + CELL / 2,
      this.labyrinthOrigin.y + tileY * CELL + CELL / 2,
      texture,
    );
    if (this.labyrinthWalls) this.physics.add.collider(sprite, this.labyrinthWalls);
    this.enemies.push({ sprite, health: kind === "spider" ? 1 : 2, nextTurnAt: 0 });
  }

  private updateEnemies(time: number, _delta: number): void {
    const player = this.tunnelPlayer;
    if (!player) return;
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) continue;
      if (time >= enemy.nextTurnAt) {
        enemy.nextTurnAt = time + Phaser.Math.Between(650, 1350);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        enemy.sprite.setVelocity(Math.cos(angle) * 34, Math.sin(angle) * 34);
      }
      if (time >= this.damageLockedUntil && Phaser.Math.Distance.Between(player.x, player.y, enemy.sprite.x, enemy.sprite.y) < 30) {
        this.damageLockedUntil = time + 900;
        const runtime = this.runtimeV29();
        runtime.health = Math.max(0, runtime.health - ENEMY_DAMAGE);
        runtime.emitState();
        player.setTintFill(0xffffff);
        this.tweens.add({ targets: player, alpha: 0.2, yoyo: true, repeat: 5, duration: 70, onComplete: () => { player.alpha = 1; player.clearTint(); } });
        if (runtime.health <= 0) this.showDeath();
      }
    }
  }

  private readonly onGunshot = (): void => {
    if (!this.inLabyrinth || !this.tunnelPlayer) return;
    const target = this.enemies
      .filter(({ sprite }) => sprite.active)
      .sort((a, b) => Phaser.Math.Distance.Between(this.tunnelPlayer!.x, this.tunnelPlayer!.y, a.sprite.x, a.sprite.y) - Phaser.Math.Distance.Between(this.tunnelPlayer!.x, this.tunnelPlayer!.y, b.sprite.x, b.sprite.y))[0];
    if (target && Phaser.Math.Distance.Between(this.tunnelPlayer.x, this.tunnelPlayer.y, target.sprite.x, target.sprite.y) < 520) this.damageEnemy(target, 99);
  };
  private readonly onTouchAttack = (): void => {
    if (!this.inLabyrinth || !this.tunnelPlayer) return;
    const target = this.enemies.find(({ sprite }) => sprite.active && Phaser.Math.Distance.Between(this.tunnelPlayer!.x, this.tunnelPlayer!.y, sprite.x, sprite.y) < 62);
    if (target) this.damageEnemy(target, 1);
  };
  private damageEnemy(enemy: EnemyV29, damage: number): void {
    enemy.health -= damage;
    if (enemy.health <= 0) enemy.sprite.disableBody(true, true);
  }

  private showDeath(): void {
    this.transitionLocked = true;
    const overlay = document.querySelector<HTMLElement>(".game-overlay");
    if (!overlay) return;
    overlay.classList.add("is-open");
    overlay.innerHTML = `<div class="message-panel"><h2>YOU DIED</h2><button>RESTART</button></div>`;
    overlay.querySelector("button")?.addEventListener("click", () => window.location.reload());
  }

  private clearInput(): void {
    this.tunnelPlayer?.setVelocity(0, 0);
    window.dispatchEvent(new Event("bunker-release-input"));
  }
  private fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, resolve);
      this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    });
  }
  private fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, resolve);
      this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
    });
  }

  private toastV29(message: string): void {
    window.dispatchEvent(new CustomEvent("bunker-toast", { detail: { message } }));
  }

  private destroyRoomVisuals(): void {
    this.roomCollider?.destroy();
    this.roomWalls?.clear(true, true);
    this.roomRoot?.destroy(true);
    this.roomCollider = undefined;
    this.roomWalls = undefined;
    this.roomRoot = undefined;
    this.roomExitDoor = undefined;
    this.roomExitPrompt = undefined;
  }
  private destroyLabyrinthVisuals(): void {
    this.destroyRoomVisuals();
    this.labyrinthCollider?.destroy();
    this.labyrinthWalls?.clear(true, true);
    for (const enemy of this.enemies) enemy.sprite.destroy();
    this.enemies = [];
    this.labyrinthRoot?.destroy(true);
    this.labyrinthCollider = undefined;
    this.labyrinthWalls = undefined;
    this.labyrinthRoot = undefined;
    this.explorationDoors = [];
  }
  private destroyV29(): void {
    window.removeEventListener("bunker-gunshot", this.onGunshot);
    window.removeEventListener("bunker-touch-attack", this.onTouchAttack);
    this.game.events.off(Phaser.Core.Events.BLUR, this.suspendLighting, this);
    this.game.events.off(Phaser.Core.Events.FOCUS, this.restoreLighting, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.restoreLighting, this);
    this.destroyLighting();
    this.destroyLabyrinthVisuals();
  }
}

import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

if (!scene.includes("TUNNEL_SURVIVAL_V25")) {
  scene = scene
    .replace(
      "  private tunnelTransitioning = false; // TUNNEL_TRANSITION_V24",
      `  private tunnelTransitioning = false; // TUNNEL_TRANSITION_V24
  private tunnelDarkness?: Phaser.GameObjects.Rectangle; // TUNNEL_SURVIVAL_V25
  private tunnelVisionMask?: Phaser.GameObjects.Graphics;
  private nextEnemyDamageAt = 0;`,
    )
    .replace(
      "    this.createEntranceDoor();",
      `    this.createEntranceDoor();
    if (this.player) {
      this.player.setPosition(this.entranceDoor.x, this.entranceDoor.y - 90);
      this.cameras.main.centerOn(this.player.x, this.player.y);
    }`,
    )
    .replace(
      "    if (this.inTunnels) this.updateEnemies(time, delta);",
      `    if (this.inTunnels) {
      this.updateEnemies(time, delta);
      this.updateTunnelVisibility();
      this.damagePlayerOnEnemyContact(time);
    }`,
    )
    .replace(
      "      this.generateTunnel();\n\n      const tunnelWidth = COLS * CELL;",
      `      this.generateTunnel();
      this.createTunnelVisibility();

      const tunnelWidth = COLS * CELL;`,
    )
    .replace(
      /{2}private leaveTunnels\(\): void \{[\s\S]*?\n{2}\}\n\n{2}private destroyTunnel\(\): void \{/,
      `  private leaveTunnels(): void {
    const player = this.player;
    if (!player || this.tunnelTransitioning) return;

    this.tunnelTransitioning = true;
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;

    const camera = this.cameras.main;
    camera.fadeOut(500, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.inTunnels = false;
      this.destroyTunnel();

      this.physics.world.setBounds(0, 0, 1920, 1088);
      camera.setBounds(0, 0, 1920, 1088);
      player.setPosition(this.entranceDoor.x, this.entranceDoor.y - 90);
      body.enable = true;
      body.setVelocity(0, 0);
      player.setCollideWorldBounds(true);

      camera.stopFollow();
      camera.setZoom(1.4);
      camera.startFollow(player, true, 0.12, 0.12);
      camera.centerOn(player.x, player.y);
      camera.fadeIn(500, 0, 0, 0);
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.tunnelTransitioning = false;
        this.toast("BACK AT THE BUNKER HATCH");
      });
    });
  }

  private createTunnelVisibility(): void {
    const width = COLS * CELL;
    const height = ROWS * CELL;
    this.tunnelDarkness = this.add
      .rectangle(
        this.tunnelOrigin.x + width / 2,
        this.tunnelOrigin.y + height / 2,
        width,
        height,
        0x000000,
        0.94,
      )
      .setDepth(35);
    this.tunnelVisionMask = this.add.graphics().setVisible(false);
    const mask = this.tunnelVisionMask.createGeometryMask();
    mask.setInvertAlpha(true);
    this.tunnelDarkness.setMask(mask);
    this.updateTunnelVisibility();
  }

  private updateTunnelVisibility(): void {
    const player = this.player;
    const mask = this.tunnelVisionMask;
    if (!player || !mask) return;

    const direction = this.lastFacing.clone();
    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      direction.set(Math.sign(direction.x) || 1, 0);
    } else {
      direction.set(0, Math.sign(direction.y) || 1);
    }

    const distance = this.visibilityDistance(player.x, player.y, direction);
    const halfWidth = 52;
    mask.clear();
    mask.fillStyle(0xffffff, 1);
    mask.fillCircle(player.x, player.y, 76);

    if (direction.x > 0) {
      mask.fillRect(player.x, player.y - halfWidth, distance, halfWidth * 2);
    } else if (direction.x < 0) {
      mask.fillRect(player.x - distance, player.y - halfWidth, distance, halfWidth * 2);
    } else if (direction.y > 0) {
      mask.fillRect(player.x - halfWidth, player.y, halfWidth * 2, distance);
    } else {
      mask.fillRect(player.x - halfWidth, player.y - distance, halfWidth * 2, distance);
    }
  }

  private visibilityDistance(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
  ): number {
    const maximum = 720;
    for (let distance = 72; distance <= maximum; distance += 16) {
      const pointX = x + direction.x * distance;
      const pointY = y + direction.y * distance;
      const blocked = this.tunnelWalls?.getChildren().some((child) => {
        const object = child as Phaser.GameObjects.GameObject & {
          getBounds?: () => Phaser.Geom.Rectangle;
        };
        return object.getBounds?.().contains(pointX, pointY) ?? false;
      });
      if (blocked) return Math.max(72, distance - 12);
    }
    return maximum;
  }

  private damagePlayerOnEnemyContact(time: number): void {
    const player = this.player;
    if (!player || time < this.nextEnemyDamageAt) return;
    const touching = this.enemies.find(
      (enemy) =>
        enemy.sprite.active &&
        Phaser.Math.Distance.Between(
          player.x,
          player.y,
          enemy.sprite.x,
          enemy.sprite.y,
        ) < 30,
    );
    if (!touching) return;

    this.nextEnemyDamageAt = time + 900;
    const runtime = this as unknown as {
      stamina: number;
      emitState: () => void;
    };
    runtime.stamina = Math.max(0, runtime.stamina - 12);
    runtime.emitState();

    this.tweens.killTweensOf(player);
    player.setAlpha(1);
    this.tweens.add({
      targets: player,
      alpha: 0.15,
      duration: 70,
      yoyo: true,
      repeat: 5,
      onComplete: () => player.setAlpha(1),
    });

    const knockback = new Phaser.Math.Vector2(
      touching.sprite.x - player.x,
      touching.sprite.y - player.y,
    );
    if (knockback.lengthSq() > 0) {
      knockback.normalize().scale(95);
      touching.sprite.setVelocity(knockback.x, knockback.y);
    }
    this.toast("BITTEN · ENERGY -12");
  }

  private destroyTunnel(): void {`,
    )
    .replace(
      "    this.exitPrompt = undefined;\n  }",
      `    this.exitPrompt = undefined;
    this.tunnelDarkness?.clearMask(true);
    this.tunnelDarkness?.destroy();
    this.tunnelDarkness = undefined;
    this.tunnelVisionMask?.destroy();
    this.tunnelVisionMask = undefined;
  }`,
    );

  if (!scene.includes("TUNNEL_SURVIVAL_V25")) {
    throw new Error("prepare-v25: tunnel survival marker was not added");
  }
}

await writeFile(scenePath, scene, "utf8");

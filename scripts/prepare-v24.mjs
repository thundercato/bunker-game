import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

if (!scene.includes("TUNNEL_TRANSITION_V24")) {
  scene = scene
    .replace(
      "  private stabHeld = false;",
      "  private stabHeld = false;\n  private tunnelTransitioning = false; // TUNNEL_TRANSITION_V24",
    )
    .replace(
      "    if (usePressed && !this.useHeld && !this.runtimeV19().uiOpen) {",
      "    if (\n      usePressed &&\n      !this.useHeld &&\n      !this.runtimeV19().uiOpen &&\n      !this.tunnelTransitioning\n    ) {",
    )
    .replace(
      /  private enterTunnels\(\): void \{[\s\S]*?\n  \}\n\n  private generateTunnel\(\): void \{/,
      `  private enterTunnels(): void {
    const player = this.player;
    if (!player || this.tunnelTransitioning) return;

    this.tunnelTransitioning = true;
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;

    const camera = this.cameras.main;
    camera.fadeOut(500, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.destroyTunnel();
      this.inTunnels = true;

      const bunkerWorld = this.physics.world.bounds;
      this.tunnelOrigin.set(bunkerWorld.right + 640, bunkerWorld.top + 320);
      this.generateTunnel();

      const tunnelWidth = COLS * CELL;
      const tunnelHeight = ROWS * CELL;
      this.physics.world.setBounds(
        this.tunnelOrigin.x,
        this.tunnelOrigin.y,
        tunnelWidth,
        tunnelHeight,
      );
      camera.setBounds(
        this.tunnelOrigin.x,
        this.tunnelOrigin.y,
        tunnelWidth,
        tunnelHeight,
      );

      player.setPosition(
        this.tunnelOrigin.x + CELL * 1.5,
        this.tunnelOrigin.y + CELL * 1.5,
      );
      body.enable = true;
      body.setVelocity(0, 0);
      player.setCollideWorldBounds(true);

      camera.stopFollow();
      camera.setZoom(1);
      camera.startFollow(player, true, 0.12, 0.12);
      camera.centerOn(player.x, player.y);
      camera.fadeIn(500, 0, 0, 0);
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.tunnelTransitioning = false;
        this.toast("THE HATCH CLANGS SHUT BEHIND YOU");
      });
    });
  }

  private generateTunnel(): void {`,
    );

  if (!scene.includes("TUNNEL_TRANSITION_V24")) {
    throw new Error("prepare-v24: tunnel transition marker was not added");
  }
}

await writeFile(scenePath, scene, "utf8");

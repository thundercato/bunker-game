// Applies the v0.0.0.13 maze-entry regression fixes idempotently.
import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV29Scene.ts", import.meta.url);
let source = await readFile(scenePath, "utf8");

if (!source.includes("this.initialiseV30StartState();")) {
  source = source.replace(
    "    this.createBunkerEntrance();\n",
    "    this.createBunkerEntrance();\n    this.initialiseV30StartState();\n",
  );
}

if (!source.includes("private initialiseV30StartState(): void")) {
  const entrancePattern =
    / {2}private createBunkerEntrance\(\): void \{[\s\S]*?\n {2}\}\n\n {2}private makeDoor/;
  const entranceReplacement = `  private createBunkerEntrance(): void {
    const bounds = this.physics.world.bounds;
    const player = this.tunnelPlayer;
    const x = player?.x ?? bounds.centerX;
    const y = player ? player.y + 58 : bounds.bottom - 150;
    this.entranceDoor = this.makeDoor(x, y, 0x43545b, 0xa8bcc4);
    this.entrancePrompt = this.makePrompt(x, y - 38, "USE · ENTER LABYRINTH");
    if (player) {
      player.setPosition(x, y - 54);
      player.setVelocity(0, 0);
    }
  }

  private initialiseV30StartState(): void {
    const runtime = this.runtimeV29();
    runtime.knifeLocation = "armed";
    runtime.emitState();
  }

  private makeDoor`;
  if (!entrancePattern.test(source)) {
    throw new Error("fix-v30-regressions: missing bunker entrance method");
  }
  source = source.replace(entrancePattern, entranceReplacement);
}

source = source.replaceAll(
  "    await this.fadeIn();\n    this.transitionLocked = false;",
  "    await this.fadeIn();\n    this.useHeld = true;\n    this.transitionLocked = false;",
);

if (!source.includes("this.tunnelPlayer.x - camera.worldView.x")) {
  const lightingPattern =
    / {4}const point = camera\.getWorldPoint\([\s\S]*? {4}const screenY = \(point\.y - camera\.worldView\.y\) \* camera\.zoom;\n/;
  const lightingReplacement = `    const screenX =
      (this.tunnelPlayer.x - camera.worldView.x) * camera.zoom;
    const screenY =
      (this.tunnelPlayer.y - camera.worldView.y) * camera.zoom;
`;
  if (!lightingPattern.test(source)) {
    throw new Error("fix-v30-regressions: missing lighting conversion");
  }
  source = source.replace(lightingPattern, lightingReplacement);
}

if (!source.includes("this.initialiseV30StartState();")) {
  throw new Error("fix-v30-regressions: failed to add start state");
}

await writeFile(scenePath, source, "utf8");

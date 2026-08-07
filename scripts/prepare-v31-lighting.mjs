// Installs the v0.0.0.15 labyrinth lighting system after all scene generators.
import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV29Scene.ts", import.meta.url);
let source = await readFile(scenePath, "utf8");

const lightingImport =
  'import { LABYRINTH_AMBIENT_RADIUS, corridorBeamDistanceCells, type LightFacing } from "@/labyrinth/LabyrinthLighting";\n';
if (!source.includes('from "@/labyrinth/LabyrinthLighting"')) {
  source = source.replace(
    'import { BunkerV18Scene } from "./BunkerV18Scene";\n',
    'import { BunkerV18Scene } from "./BunkerV18Scene";\n' + lightingImport,
  );
}

if (!source.includes("direction: LightFacing;")) {
  source = source.replace(
    "type RuntimeV29 = {\n  uiOpen: boolean;\n",
    "type RuntimeV29 = {\n  uiOpen: boolean;\n  direction: LightFacing;\n",
  );
}

const lightingPattern =
  /  private initialiseLighting\(\): void \{[\s\S]*?\n  private suspendLighting\(\): void \{/;

const lightingReplacement = `  private initialiseLighting(): void {
    this.destroyLighting();
    const camera = this.cameras.main;
    this.lighting = this.add
      .renderTexture(0, 0, camera.width, camera.height)
      .setScrollFactor(0)
      .setDepth(900)
      .setOrigin(0)
      .setScale(1 / camera.zoom);
    this.lightingBrush = this.make.graphics({ x: 0, y: 0 });
    this.updateLighting();
  }

  private updateLighting(): void {
    if (!this.lighting || !this.lightingBrush || !this.tunnelPlayer) return;
    const camera = this.cameras.main;
    const expectedScale = 1 / camera.zoom;
    if (
      this.lighting.width !== camera.width ||
      this.lighting.height !== camera.height ||
      Math.abs(this.lighting.scaleX - expectedScale) > 0.001
    ) {
      this.initialiseLighting();
      return;
    }

    // worldView is already in world coordinates. Convert the player directly
    // into camera pixels; getWorldPoint performs the opposite conversion.
    const screenX =
      (this.tunnelPlayer.x - camera.worldView.x) * camera.zoom;
    const screenY =
      (this.tunnelPlayer.y - camera.worldView.y) * camera.zoom;

    this.lighting.clear();
    this.lighting.fill(0x000000, 0.97);
    this.lightingBrush.clear();

    if (this.inRoom) {
      const radius = ROOM_VISIBILITY_RADIUS * camera.zoom;
      for (let layer = 12; layer >= 1; layer -= 1) {
        const fraction = layer / 12;
        const alpha = 0.1 + (1 - fraction) * 0.22;
        this.lightingBrush.fillStyle(0xffffff, alpha);
        this.lightingBrush.fillCircle(
          screenX,
          screenY,
          radius * fraction,
        );
      }
      this.lightingBrush.fillStyle(0xffffff, 0.72);
      this.lightingBrush.fillCircle(screenX, screenY, radius * 0.2);
    } else if (this.labyrinth) {
      const radius = LABYRINTH_AMBIENT_RADIUS * camera.zoom;
      // A soft local pool makes the shape of the current junction readable.
      for (let layer = 12; layer >= 1; layer -= 1) {
        const fraction = layer / 12;
        const alpha = 0.08 + (1 - fraction) * 0.18;
        this.lightingBrush.fillStyle(0xffffff, alpha);
        this.lightingBrush.fillCircle(
          screenX,
          screenY,
          radius * fraction,
        );
      }
      this.lightingBrush.fillStyle(0xffffff, 0.72);
      this.lightingBrush.fillCircle(screenX, screenY, radius * 0.24);

      // Throw the torch only down the corridor the survivor is facing. The
      // maze grid stops the beam at the first wall so it cannot reveal space
      // behind a corner.
      const tile = {
        x: Phaser.Math.Clamp(
          Math.floor((this.tunnelPlayer.x - this.labyrinthOrigin.x) / CELL),
          0,
          this.labyrinth.width - 1,
        ),
        y: Phaser.Math.Clamp(
          Math.floor((this.tunnelPlayer.y - this.labyrinthOrigin.y) / CELL),
          0,
          this.labyrinth.height - 1,
        ),
      };
      const facing = this.runtimeV29().direction;
      const beamCells = corridorBeamDistanceCells(
        this.labyrinth.walls,
        tile,
        facing,
      );
      const beamLength = beamCells * CELL * camera.zoom;
      const direction =
        facing === "left"
          ? { x: -1, y: 0 }
          : facing === "right"
            ? { x: 1, y: 0 }
            : facing === "up"
              ? { x: 0, y: -1 }
              : { x: 0, y: 1 };
      const slices = Math.max(1, Math.ceil(beamCells * 3));
      const sliceLength = beamLength / slices + 1;

      for (let slice = 0; slice < slices; slice += 1) {
        const progress = (slice + 0.5) / slices;
        const distance = (slice + 0.5) * (beamLength / slices);
        const brightness = Phaser.Math.Linear(1, 0.5, progress);
        const cx = screenX + direction.x * distance;
        const cy = screenY + direction.y * distance;
        const horizontal = direction.x !== 0;
        const drawSlice = (width: number, alpha: number): void => {
          const cross = width * camera.zoom;
          this.lightingBrush!.fillStyle(0xffffff, alpha * brightness);
          this.lightingBrush!.fillRoundedRect(
            cx - (horizontal ? sliceLength / 2 : cross / 2),
            cy - (horizontal ? cross / 2 : sliceLength / 2),
            horizontal ? sliceLength : cross,
            horizontal ? cross : sliceLength,
            Math.min(7, cross / 4),
          );
        };
        drawSlice(64, 0.18);
        drawSlice(50, 0.38);
        drawSlice(34, 0.7);
      }
    }

    // RenderTexture.erase honours the brush alpha. Using the explicit erase
    // operation avoids renderer-dependent blend-mode behaviour on iOS/WebGL.
    this.lighting.erase(this.lightingBrush);
  }

  private suspendLighting(): void {`;

if (!lightingPattern.test(source)) {
  throw new Error("prepare-v31-lighting: lighting methods not found");
}
source = source.replace(lightingPattern, lightingReplacement);

if (
  !source.includes("corridorBeamDistanceCells(") ||
  !source.includes("this.lighting.erase(this.lightingBrush)")
) {
  throw new Error("prepare-v31-lighting: failed to install lighting system");
}

await writeFile(scenePath, source, "utf8");

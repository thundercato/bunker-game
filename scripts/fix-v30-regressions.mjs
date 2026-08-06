import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV29Scene.ts", import.meta.url);
let source = await readFile(scenePath, "utf8");

const replaceRequired = (from, to, label) => {
  if (!source.includes(from)) {
    if (source.includes(to)) return;
    throw new Error(`fix-v30-regressions: missing ${label}`);
  }
  source = source.replace(from, to);
};

replaceRequired(
  "    this.createBunkerEntrance();\n",
  "    this.createBunkerEntrance();\n    this.initialiseV30StartState();\n",
  "start-state hook",
);

replaceRequired(
`  private createBunkerEntrance(): void {
    const bounds = this.physics.world.bounds;
    const x = bounds.centerX;
    const y = bounds.bottom - 90;
    this.entranceDoor = this.makeDoor(x, y, 0x43545b, 0xa8bcc4);
    this.entrancePrompt = this.makePrompt(x, y - 38, "USE · ENTER LABYRINTH");
  }
`,
`  private createBunkerEntrance(): void {
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
`,
  "accessible bunker entrance",
);

replaceRequired(
`    await this.fadeIn();
    this.transitionLocked = false;
  }

  private buildLabyrinth`,
`    await this.fadeIn();
    this.useHeld = true;
    this.transitionLocked = false;
  }

  private buildLabyrinth`,
  "labyrinth entry debounce",
);

replaceRequired(
`    this.cameras.main.startFollow(this.tunnelPlayer, true, 0.12, 0.12);
    await this.fadeIn();
    this.transitionLocked = false;
  }

  private async enterRoom`,
`    this.cameras.main.startFollow(this.tunnelPlayer, true, 0.12, 0.12);
    await this.fadeIn();
    this.useHeld = true;
    this.transitionLocked = false;
  }

  private async enterRoom`,
  "bunker return debounce",
);

replaceRequired(
`    this.buildRoom(this.activeRoom);
    await this.fadeIn();
    this.transitionLocked = false;
  }

  private buildRoom`,
`    this.buildRoom(this.activeRoom);
    await this.fadeIn();
    this.useHeld = true;
    this.transitionLocked = false;
  }

  private buildRoom`,
  "room entry debounce",
);

replaceRequired(
`    this.initialiseLighting();
    await this.fadeIn();
    this.transitionLocked = false;
  }

  private ensureFurnitureTextures`,
`    this.initialiseLighting();
    await this.fadeIn();
    this.useHeld = true;
    this.transitionLocked = false;
  }

  private ensureFurnitureTextures`,
  "room exit debounce",
);

replaceRequired(
`    const point = camera.getWorldPoint(
      this.tunnelPlayer.x,
      this.tunnelPlayer.y,
    );
    const screenX = (point.x - camera.worldView.x) * camera.zoom;
    const screenY = (point.y - camera.worldView.y) * camera.zoom;
`,
`    const screenX =
      (this.tunnelPlayer.x - camera.worldView.x) * camera.zoom;
    const screenY =
      (this.tunnelPlayer.y - camera.worldView.y) * camera.zoom;
`,
  "lighting screen-space conversion",
);

await writeFile(scenePath, source, "utf8");

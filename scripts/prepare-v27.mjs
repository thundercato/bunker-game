import { readFile, writeFile } from "node:fs/promises";

const scenePath = new URL("../src/scenes/BunkerV19Scene.ts", import.meta.url);
let scene = await readFile(scenePath, "utf8");

scene = scene
  .replace(
    'type EnemyKind = "spider" | "rat";',
    'type EnemyKind = "spider" | "rat" | "lurker";',
  )
  .replace(
    "const CELL = 64;\nconst COLS = 25;\nconst ROWS = 17;",
    "const CELL = 48;\nconst COLS = 49;\nconst ROWS = 33;",
  )
  .replace(
    "    this.playerV19 = this.findPlayer();",
    '    this.playerV19 = this.findPlayer();\n    this.runtimeV19().knifeLocation = "armed";',
  )
  .replace(
    "type Runtime = {\n  uiOpen: boolean;\n};",
    'type Runtime = {\n  uiOpen: boolean;\n  health: number;\n  knifeLocation: "storage" | "backpack" | "armed" | "world";\n  emitState: () => void;\n};',
  )
  .replace(
    "    this.enemies.push({ sprite, kind, health: 2, nextTurnAt: 0 });",
    '    const health = kind === "spider" ? 1 : kind === "rat" ? 2 : 3;\n    this.enemies.push({ sprite, kind, health, nextTurnAt: 0 });',
  )
  .replace(
    "    if (best) this.damageEnemy(best, 2);",
    '    if (best) this.damageEnemy(best, best.kind === "lurker" ? 2 : 99);',
  )
  .replace(
    "    if (target) this.damageEnemy(target, 1);",
    '    if (target) this.damageEnemy(target, target.kind === "spider" ? 99 : 1);',
  )
  .replace(
    "      this.runtimeV19().stamina = Math.max(\n        0,\n        this.runtimeV19().stamina - ENEMY_CONTACT_DAMAGE,\n      );",
    "      this.runtimeV19().health = Math.max(\n        0,\n        this.runtimeV19().health - ENEMY_CONTACT_DAMAGE,\n      );",
  )
  .replace(
    "      this.toastV19(`${enemy.kind.toUpperCase()} BITE · -${ENEMY_CONTACT_DAMAGE} ENERGY`);",
    '      this.toastV19(enemy.kind.toUpperCase() + " ATTACK · -" + ENEMY_CONTACT_DAMAGE + " HEALTH");',
  )
  .replace(
    '    const kind: EnemyKind = Math.random() < 0.55 ? "spider" : "rat";',
    '    const roll = Math.random();\n    const kind: EnemyKind = roll < 0.48 ? "spider" : roll < 0.96 ? "rat" : "lurker";',
  )
  .replace(
    "    const enemyCount = Phaser.Math.Between(10, 16);",
    "    const enemyCount = Phaser.Math.Between(28, 42);",
  )
  .replace(
    "    const root = this.add.container(0, 0).setDepth(1);",
    "    const deadEnds: Array<{ x: number; y: number }> = [];\n    for (let dy = 1; dy < ROWS - 1; dy += 1) {\n      for (let dx = 1; dx < COLS - 1; dx += 1) {\n        if (grid[dy]![dx]) continue;\n        const exits = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([ox, oy]) => !grid[dy + oy]![dx + ox]).length;\n        if (exits === 1 && !(dx === 1 && dy === 1)) deadEnds.push({ x: dx, y: dy });\n      }\n    }\n    for (const room of deadEnds) {\n      for (let ry = -1; ry <= 1; ry += 1) {\n        for (let rx = -1; rx <= 1; rx += 1) {\n          const gx = Phaser.Math.Clamp(room.x + rx, 1, COLS - 2);\n          const gy = Phaser.Math.Clamp(room.y + ry, 1, ROWS - 2);\n          grid[gy]![gx] = false;\n        }\n      }\n    }\n\n    const root = this.add.container(0, 0).setDepth(1);",
  )
  .replace(
    "    root.add([this.exitMarker, this.exitPrompt]);",
    "    root.add([this.exitMarker, this.exitPrompt]);\n\n    for (const room of deadEnds) {\n      const roomX = this.tunnelOrigin.x + room.x * CELL + CELL / 2;\n      const roomY = this.tunnelOrigin.y + room.y * CELL + CELL / 2;\n      const door = this.add.rectangle(roomX, roomY, 34, 10, 0x4b3d30).setStrokeStyle(2, 0x8d7358).setDepth(8);\n      const cabinet = this.add.rectangle(roomX, roomY - 24, 30, 24, Math.random() < 0.2 ? 0x73827b : 0x4a4037).setStrokeStyle(2, 0x1a1714).setDepth(8);\n      root.add([door, cabinet]);\n    }",
  );

if (
  !scene.includes("const COLS = 49;") ||
  !scene.includes('knifeLocation = "armed"')
) {
  throw new Error("prepare-v27: expected tunnel upgrades were not applied");
}

await writeFile(scenePath, scene, "utf8");

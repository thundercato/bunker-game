export type LightFacing = "up" | "down" | "left" | "right";
export type LightingTile = { x: number; y: number };

export const LABYRINTH_AMBIENT_RADIUS = 96;
export const LABYRINTH_BEAM_MAX_CELLS = 30;

const STEP: Record<LightFacing, LightingTile> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Measure a straight torch throw from the player's tile to the first solid
 * cell. The returned distance includes part of that wall so the player can
 * actually see what terminates the corridor, but never reaches through it.
 */
export function corridorBeamDistanceCells(
  walls: boolean[][],
  playerTile: LightingTile,
  facing: LightFacing,
  maxCells = LABYRINTH_BEAM_MAX_CELLS,
): number {
  if (walls.length === 0 || maxCells <= 0) return 0;
  const delta = STEP[facing];
  const width = walls[0]?.length ?? 0;

  for (let step = 1; step <= maxCells; step += 1) {
    const x = playerTile.x + delta.x * step;
    const y = playerTile.y + delta.y * step;
    if (x < 0 || y < 0 || y >= walls.length || x >= width) {
      return Math.max(0, step - 0.5);
    }
    if (walls[y]?.[x]) return step + 0.25;
  }

  return maxCells;
}

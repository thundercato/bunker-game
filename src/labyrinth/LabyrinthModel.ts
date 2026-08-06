export type CardinalSide = "north" | "east" | "south" | "west";
export type TilePoint = { x: number; y: number };
export type ExplorationDoor = {
  id: string;
  roomId: string;
  side: CardinalSide;
  tile: TilePoint;
  approach: TilePoint;
};
export type FurnitureKind = "desk" | "drawers" | "cupboard" | "chest";
export type FurnitureState = {
  id: string;
  kind: FurnitureKind;
  tile: TilePoint;
  locked?: boolean;
  opened?: boolean;
};
export type ExplorationRoomState = {
  id: string;
  seed: number;
  width: number;
  height: number;
  shape: "rectangle" | "l";
  visited: boolean;
  furniture: FurnitureState[];
};
export type LabyrinthRunState = {
  seed: number;
  width: number;
  height: number;
  walls: boolean[][];
  entrance: TilePoint;
  spawn: TilePoint;
  explorationDoors: ExplorationDoor[];
  roomStates: Record<string, ExplorationRoomState>;
  currentDoorId?: string;
};

export const LABYRINTH_VISIBILITY_RADIUS = 190;
export const ROOM_VISIBILITY_MULTIPLIER = 4;
export const ROOM_VISIBILITY_RADIUS =
  LABYRINTH_VISIBILITY_RADIUS * ROOM_VISIBILITY_MULTIPLIER;
export const CHEST_UNLOCKED_CHANCE = 0.1;

class Rng {
  public constructor(private state: number) {}
  public next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  public int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  public pick<T>(values: readonly T[]): T {
    return values[Math.floor(this.next() * values.length)]!;
  }
}

const key = (point: TilePoint): string => `${point.x},${point.y}`;
const neighbours = (point: TilePoint): TilePoint[] => [
  { x: point.x + 1, y: point.y },
  { x: point.x - 1, y: point.y },
  { x: point.x, y: point.y + 1 },
  { x: point.x, y: point.y - 1 },
];

export function isWalkable(state: LabyrinthRunState, point: TilePoint): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < state.width &&
    point.y < state.height &&
    !state.walls[point.y]![point.x]
  );
}

export function reachable(
  state: LabyrinthRunState,
  start: TilePoint,
  target: TilePoint,
): boolean {
  if (!isWalkable(state, start) || !isWalkable(state, target)) return false;
  const queue = [start];
  const seen = new Set([key(start)]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === target.x && current.y === target.y) return true;
    for (const next of neighbours(current)) {
      if (!isWalkable(state, next) || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return false;
}

export function generateExplorationRoom(
  roomId: string,
  seed: number,
): ExplorationRoomState {
  const rng = new Rng(seed);
  const width = rng.int(7, 10);
  const height = rng.int(6, 8);
  const shape = rng.next() < 0.2 ? "l" : "rectangle";
  const candidates: FurnitureKind[] = ["desk", "drawers", "cupboard"];
  if (rng.next() < 0.55) candidates.push("chest");
  const count = Math.min(candidates.length, rng.int(2, 4));
  const occupied = new Set<string>([`${Math.floor(width / 2)},${height - 2}`]);
  const furniture: FurnitureState[] = [];
  for (let index = 0; index < count; index += 1) {
    const kind = candidates[index]!;
    let tile = { x: 1, y: 1 };
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const candidate = {
        x: rng.int(1, width - 2),
        y: rng.int(1, height - 3),
      };
      if (!occupied.has(key(candidate))) {
        tile = candidate;
        break;
      }
    }
    occupied.add(key(tile));
    furniture.push({
      id: `${roomId}-${kind}-${index}`,
      kind,
      tile,
      ...(kind === "chest"
        ? { locked: rng.next() >= CHEST_UNLOCKED_CHANCE, opened: false }
        : {}),
    });
  }
  return { id: roomId, seed, width, height, shape, visited: false, furniture };
}

export function generateLabyrinth(seed: number): LabyrinthRunState {
  const width = 49;
  const height = 37;
  const rng = new Rng(seed);
  const walls = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => true),
  );
  const carve = (x: number, y: number): void => {
    walls[y]![x] = false;
  };
  const stack: TilePoint[] = [{ x: 1, y: 1 }];
  carve(1, 1);
  const directions = [
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 0, y: 2 },
    { x: 0, y: -2 },
  ];
  while (stack.length > 0) {
    const current = stack.at(-1)!;
    const choices = directions.filter(({ x, y }) => {
      const nx = current.x + x;
      const ny = current.y + y;
      return nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1 && walls[ny]![nx];
    });
    if (choices.length === 0) {
      stack.pop();
      continue;
    }
    const direction = rng.pick(choices);
    carve(current.x + direction.x / 2, current.y + direction.y / 2);
    const next = { x: current.x + direction.x, y: current.y + direction.y };
    carve(next.x, next.y);
    stack.push(next);
  }

  const entrance = { x: Math.floor(width / 2) | 1, y: height - 1 };
  const spawn = { x: entrance.x, y: height - 3 };
  carve(entrance.x, entrance.y);
  carve(entrance.x, height - 2);
  carve(spawn.x, spawn.y);
  for (let y = spawn.y; y >= height - 7; y -= 1) carve(entrance.x, y);

  const sides: CardinalSide[] = ["north", "east", "south", "west"];
  const positions: Record<CardinalSide, ExplorationDoor> = {
    north: {
      id: `labyrinth-${seed}-door-0`,
      roomId: `labyrinth-${seed}-room-0`,
      side: "north",
      tile: { x: 5, y: 0 },
      approach: { x: 5, y: 1 },
    },
    east: {
      id: `labyrinth-${seed}-door-1`,
      roomId: `labyrinth-${seed}-room-1`,
      side: "east",
      tile: { x: width - 1, y: 7 },
      approach: { x: width - 2, y: 7 },
    },
    south: {
      id: `labyrinth-${seed}-door-2`,
      roomId: `labyrinth-${seed}-room-2`,
      side: "south",
      tile: { x: width - 8, y: height - 1 },
      approach: { x: width - 8, y: height - 2 },
    },
    west: {
      id: `labyrinth-${seed}-door-3`,
      roomId: `labyrinth-${seed}-room-3`,
      side: "west",
      tile: { x: 0, y: height - 10 },
      approach: { x: 1, y: height - 10 },
    },
  };
  for (const side of sides) {
    const door = positions[side];
    carve(door.tile.x, door.tile.y);
    carve(door.approach.x, door.approach.y);
    if (side === "north" || side === "south") {
      for (let y = Math.min(door.approach.y, spawn.y); y <= Math.max(door.approach.y, spawn.y); y += 1)
        carve(door.approach.x, y);
      for (let x = Math.min(door.approach.x, spawn.x); x <= Math.max(door.approach.x, spawn.x); x += 1)
        carve(x, spawn.y);
    } else {
      for (let x = Math.min(door.approach.x, spawn.x); x <= Math.max(door.approach.x, spawn.x); x += 1)
        carve(x, door.approach.y);
      for (let y = Math.min(door.approach.y, spawn.y); y <= Math.max(door.approach.y, spawn.y); y += 1)
        carve(spawn.x, y);
    }
  }

  const explorationDoors = sides.map((side) => positions[side]);
  const roomStates = Object.fromEntries(
    explorationDoors.map((door, index) => [
      door.roomId,
      generateExplorationRoom(door.roomId, seed * 31 + index + 1),
    ]),
  );
  return { seed, width, height, walls, entrance, spawn, explorationDoors, roomStates };
}

export function validateLabyrinth(state: LabyrinthRunState): string[] {
  const errors: string[] = [];
  if (state.explorationDoors.length !== 4) errors.push("expected four exploration doors");
  if (!isWalkable(state, state.entrance)) errors.push("entrance outside walkable grid");
  if (!isWalkable(state, state.spawn)) errors.push("spawn is not walkable");
  if (!reachable(state, state.spawn, state.entrance)) errors.push("entrance is unreachable");
  for (const door of state.explorationDoors) {
    if (!isWalkable(state, door.tile)) errors.push(`${door.id} outside map`);
    if (!isWalkable(state, door.approach)) errors.push(`${door.id} approach blocked`);
    if (!reachable(state, state.spawn, door.approach)) errors.push(`${door.id} unreachable`);
    const continuations = neighbours(door.tile).filter((point) => isWalkable(state, point));
    if (continuations.length !== 1) errors.push(`${door.id} does not terminate corridor`);
  }
  return errors;
}

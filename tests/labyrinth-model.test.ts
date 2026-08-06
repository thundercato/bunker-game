import { describe, expect, it } from "vitest";
import {
  CHEST_UNLOCKED_CHANCE,
  LABYRINTH_VISIBILITY_RADIUS,
  ROOM_VISIBILITY_RADIUS,
  generateExplorationRoom,
  generateLabyrinth,
  reachable,
  validateLabyrinth,
} from "../src/labyrinth/LabyrinthModel";

describe("labyrinth model", () => {
  it("creates four edge exploration doors separate from the entrance", () => {
    const state = generateLabyrinth(1234);
    expect(state.explorationDoors).toHaveLength(4);
    expect(new Set(state.explorationDoors.map((door) => door.side))).toEqual(
      new Set(["north", "east", "south", "west"]),
    );
    expect(
      state.explorationDoors.some(
        (door) =>
          door.tile.x === state.entrance.x && door.tile.y === state.entrance.y,
      ),
    ).toBe(false);
  });

  it("keeps every door in bounds, reachable and at a corridor termination", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const state = generateLabyrinth(seed);
      expect(validateLabyrinth(state), `seed ${seed}`).toEqual([]);
      for (const door of state.explorationDoors) {
        expect(door.tile.x).toBeGreaterThanOrEqual(0);
        expect(door.tile.y).toBeGreaterThanOrEqual(0);
        expect(door.tile.x).toBeLessThan(state.width);
        expect(door.tile.y).toBeLessThan(state.height);
        expect(reachable(state, state.spawn, door.approach)).toBe(true);
      }
    }
  });

  it("is deterministic for a fixed seed", () => {
    const first = generateLabyrinth(99117);
    const second = generateLabyrinth(99117);
    expect(second.explorationDoors).toEqual(first.explorationDoors);
    expect(second.walls).toEqual(first.walls);
    expect(second.roomStates).toEqual(first.roomStates);
  });

  it("generates persistent deterministic room furniture and chest state", () => {
    const first = generateExplorationRoom("room-a", 88);
    const second = generateExplorationRoom("room-a", 88);
    expect(second).toEqual(first);
    const chest = first.furniture.find((item) => item.kind === "chest");
    if (chest) {
      const reconstructed = generateExplorationRoom("room-a", 88).furniture.find(
        (item) => item.kind === "chest",
      );
      expect(reconstructed?.locked).toBe(chest.locked);
    }
  });

  it("keeps furniture clear of the room doorway spawn", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const room = generateExplorationRoom(`room-${seed}`, seed);
      const spawn = `${Math.floor(room.width / 2)},${room.height - 2}`;
      expect(room.furniture.map((item) => `${item.tile.x},${item.tile.y}`)).not.toContain(
        spawn,
      );
      expect(room.furniture.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses the configured ten percent unlocked chest rule", () => {
    expect(CHEST_UNLOCKED_CHANCE).toBe(0.1);
  });

  it("uses four times the labyrinth visibility radius in rooms", () => {
    expect(ROOM_VISIBILITY_RADIUS).toBe(LABYRINTH_VISIBILITY_RADIUS * 4);
  });
});

import { describe, expect, it } from "vitest";
import { corridorBeamDistanceCells } from "./LabyrinthLighting";

describe("corridorBeamDistanceCells", () => {
  const walls = [
    [true, true, true, true, true, true, true],
    [true, false, false, false, false, false, true],
    [true, true, true, false, true, true, true],
    [true, false, false, false, false, false, true],
    [true, true, true, true, true, true, true],
  ];

  it("throws light along the facing corridor until its terminating wall", () => {
    expect(
      corridorBeamDistanceCells(walls, { x: 3, y: 1 }, "left"),
    ).toBe(3.25);
    expect(
      corridorBeamDistanceCells(walls, { x: 3, y: 1 }, "right"),
    ).toBe(3.25);
  });

  it("changes the traced corridor when the player changes facing", () => {
    expect(
      corridorBeamDistanceCells(walls, { x: 3, y: 1 }, "down"),
    ).toBe(3.25);
    expect(
      corridorBeamDistanceCells(walls, { x: 3, y: 3 }, "up"),
    ).toBe(3.25);
  });

  it("caps long straight corridors without leaking beyond the requested range", () => {
    const long = [Array.from({ length: 40 }, (_, x) => x === 0 || x === 39)];
    expect(
      corridorBeamDistanceCells(long, { x: 1, y: 0 }, "right", 8),
    ).toBe(8);
  });
});

import { describe, expect, it } from "vitest";
import Phaser from "phaser";
import { calculateRoomCamera } from "@/camera/RoomCamera";

describe("calculateRoomCamera", () => {
  it("centres a smaller room without zooming above 1:1", () => {
    const result = calculateRoomCamera(
      new Phaser.Geom.Rectangle(64, 96, 576, 448),
      { x: 0, y: 0, width: 1280, height: 720 },
    );

    expect(result.zoom).toBe(1);
    expect(result.viewport).toEqual({
      x: 352,
      y: 136,
      width: 576,
      height: 448,
    });
    expect(result.scrollX).toBe(64);
    expect(result.scrollY).toBe(96);
  });

  it("scales a larger room uniformly so its entire rectangle fits", () => {
    const result = calculateRoomCamera(
      new Phaser.Geom.Rectangle(100, 200, 1600, 900),
      { x: 0, y: 0, width: 1280, height: 720 },
    );

    expect(result.zoom).toBe(0.8);
    expect(result.viewport).toEqual({ x: 0, y: 0, width: 1280, height: 720 });
    expect(result.scrollX).toBe(100);
    expect(result.scrollY).toBe(200);
  });

  it("letterboxes aspect-ratio differences instead of cropping or showing outside", () => {
    const result = calculateRoomCamera(
      new Phaser.Geom.Rectangle(0, 0, 1000, 1000),
      { x: 0, y: 0, width: 1280, height: 720 },
    );

    expect(result.zoom).toBe(0.72);
    expect(result.viewport).toEqual({ x: 280, y: 0, width: 720, height: 720 });
  });
});

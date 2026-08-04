import { describe, expect, it } from "vitest";
import { CONSUMABLES } from "@/systems/ConsumableSystem";

describe("consumable catalogue", () => {
  it("defines usable values for every food and packaged drink", () => {
    const consumables = Object.values(CONSUMABLES);
    expect(consumables.length).toBeGreaterThanOrEqual(12);

    for (const item of consumables) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.stackSize).toBeGreaterThan(0);
      expect(item.weightKg).toBeGreaterThan(0);
      expect(item.calories).toBeGreaterThanOrEqual(0);

      if (item.kind === "food") expect(item.hungerRestored).toBeGreaterThan(0);
      if (item.kind === "drink")
        expect(item.hydrationRestored).toBeGreaterThan(0);
    }
  });

  it("keeps the flask as a full-thirst liquid container", () => {
    expect(CONSUMABLES.flask.kind).toBe("liquid-container");
    expect(CONSUMABLES.flask.hydrationRestored).toBe(100);
  });
});

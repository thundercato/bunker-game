import { describe, expect, it, vi } from "vitest";
import { InventoryStore } from "@/inventory/InventoryStore";

type Item = { id: string; location: "storage" | "backpack" };

describe("InventoryStore", () => {
  it("keeps twenty repeated storage sessions consistent", () => {
    const store = new InventoryStore<Item>((item) => item.id);
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `item-${index}`,
      location: "storage" as const,
    }));
    store.replace(items);

    for (let cycle = 0; cycle < 20; cycle += 1) {
      const selectedId = `item-${cycle % items.length}`;
      const selected = store.values().find((item) => item.id === selectedId);
      expect(selected).toBeDefined();
      if (!selected) throw new Error(`Missing ${selectedId}`);

      selected.location = "backpack";
      store.upsert(selected);

      const rendered = store
        .values()
        .filter((item) => item.location === "storage");
      const reopened = store
        .values()
        .filter((item) => item.location === "storage");
      expect(rendered).toEqual(reopened);
      expect(new Set(rendered.map((item) => item.id)).size).toBe(
        rendered.length,
      );
      expect(rendered.some((item) => item.id === selectedId)).toBe(false);

      selected.location = "storage";
      store.upsert(selected);
      expect(store.values()).toHaveLength(items.length);
    }
  });

  it("notifies one canonical snapshot per mutation", () => {
    const store = new InventoryStore<Item>((item) => item.id);
    const listener = vi.fn();
    store.subscribe(listener);
    store.replace([{ id: "makarov", location: "storage" }]);
    store.upsert({ id: "makarov", location: "backpack" });

    expect(listener).toHaveBeenLastCalledWith([
      { id: "makarov", location: "backpack" },
    ]);
  });
});

export type LiquidKind =
  | "clean-water"
  | "dirty-water"
  | "coffee"
  | "tea"
  | "soup"
  | "fuel"
  | "alcohol"
  | "medicine";

export type ConsumableDefinition = {
  id: string;
  name: string;
  description: string;
  kind: "food" | "liquid-container";
  hungerRestored: number;
  hydrationRestored: number;
  weightKg: number;
  stackSize: number;
  spoilable: boolean;
  calories: number;
};

export type ConsumableState = {
  quantity: number;
  liquid?: LiquidKind;
  fillPercent?: number;
};

export const CONSUMABLES: Record<string, ConsumableDefinition> = {
  flask: {
    id: "flask",
    name: "WATER FLASK",
    description: "A battered metal flask with a screw cap.",
    kind: "liquid-container",
    hungerRestored: 0,
    hydrationRestored: 100,
    weightKg: 0.45,
    stackSize: 1,
    spoilable: false,
    calories: 0,
  },
  beans: {
    id: "beans",
    name: "TIN OF BEANS",
    description: "A dented tin of beans in tomato sauce.",
    kind: "food",
    hungerRestored: 34,
    hydrationRestored: 4,
    weightKg: 0.42,
    stackSize: 4,
    spoilable: false,
    calories: 330,
  },
  energyBar: {
    id: "energy-bar",
    name: "ENERGY BAR",
    description: "Dense, sweet and designed to survive a rucksack.",
    kind: "food",
    hungerRestored: 18,
    hydrationRestored: -2,
    weightKg: 0.07,
    stackSize: 6,
    spoilable: false,
    calories: 240,
  },
  crisps: {
    id: "crisps",
    name: "PACKET OF CRISPS",
    description: "Salted crisps in a faded foil packet.",
    kind: "food",
    hungerRestored: 12,
    hydrationRestored: -3,
    weightKg: 0.04,
    stackSize: 6,
    spoilable: false,
    calories: 190,
  },
  chocolate: {
    id: "chocolate",
    name: "CHOCOLATE",
    description: "A slightly bloomed bar of milk chocolate.",
    kind: "food",
    hungerRestored: 16,
    hydrationRestored: 0,
    weightKg: 0.1,
    stackSize: 5,
    spoilable: false,
    calories: 520,
  },
  apple: {
    id: "apple",
    name: "APPLE",
    description: "Bruised, but still crisp enough to eat.",
    kind: "food",
    hungerRestored: 10,
    hydrationRestored: 6,
    weightKg: 0.18,
    stackSize: 4,
    spoilable: true,
    calories: 95,
  },
  ration: {
    id: "ration-pack",
    name: "MILITARY RATION PACK",
    description: "A sealed field ration containing a complete meal.",
    kind: "food",
    hungerRestored: 55,
    hydrationRestored: 2,
    weightKg: 0.75,
    stackSize: 2,
    spoilable: false,
    calories: 1200,
  },
};

const STORAGE_KEY = "bunker-consumables-v1";

export class ConsumableStore {
  private readonly state = new Map<string, ConsumableState>();

  public constructor() {
    this.load();
    this.ensureDefaults();
  }

  public get(id: string): ConsumableState {
    const state = this.state.get(id);
    if (!state) throw new Error(`Unknown consumable state: ${id}`);
    return state;
  }

  public set(id: string, state: ConsumableState): void {
    this.state.set(id, { ...state });
    this.save();
  }

  public consumeOne(id: string): boolean {
    const state = this.get(id);
    if (state.quantity <= 0) return false;
    state.quantity -= 1;
    this.set(id, state);
    return true;
  }

  public setFlaskFill(
    fillPercent: number,
    liquid: LiquidKind = "clean-water",
  ): void {
    const state = this.get("flask");
    this.set("flask", {
      ...state,
      liquid,
      fillPercent: Math.max(0, Math.min(100, fillPercent)),
    });
  }

  private ensureDefaults(): void {
    const defaults: Record<string, ConsumableState> = {
      flask: { quantity: 1, liquid: "clean-water", fillPercent: 35 },
      beans: { quantity: 1 },
      "energy-bar": { quantity: 2 },
      crisps: { quantity: 1 },
      chocolate: { quantity: 1 },
      apple: { quantity: 1 },
      "ration-pack": { quantity: 1 },
    };
    for (const [id, state] of Object.entries(defaults)) {
      if (!this.state.has(id)) this.state.set(id, state);
    }
    this.save();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ConsumableState>;
      for (const [id, state] of Object.entries(parsed))
        this.state.set(id, state);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(this.state)),
    );
  }
}

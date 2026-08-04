export type InventoryListener<T> = (items: readonly T[]) => void;

export class InventoryStore<T> {
  private readonly items = new Map<string, T>();
  private readonly listeners = new Set<InventoryListener<T>>();

  public constructor(private readonly identify: (item: T) => string) {}

  public replace(items: readonly T[]): void {
    this.items.clear();
    for (const item of items) this.items.set(this.identify(item), item);
    this.emit();
  }

  public upsert(item: T): void {
    this.items.set(this.identify(item), item);
    this.emit();
  }

  public remove(id: string): boolean {
    const removed = this.items.delete(id);
    if (removed) this.emit();
    return removed;
  }

  public values(): T[] {
    return Array.from(this.items.values());
  }

  public subscribe(listener: InventoryListener<T>): () => void {
    this.listeners.add(listener);
    listener(this.values());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.values();
    for (const listener of this.listeners) listener(snapshot);
  }
}

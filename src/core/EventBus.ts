export type EventMap = Record<string, unknown>;

type EventHandler<T> = (payload: T) => void;

export class EventBus<TEvents extends EventMap> {
  private readonly handlers = new Map<
    keyof TEvents,
    Set<EventHandler<unknown>>
  >();

  public on<TKey extends keyof TEvents>(
    event: TKey,
    handler: EventHandler<TEvents[TKey]>,
  ): () => void {
    const listeners =
      this.handlers.get(event) ?? new Set<EventHandler<unknown>>();
    listeners.add(handler as EventHandler<unknown>);
    this.handlers.set(event, listeners);
    return () => listeners.delete(handler as EventHandler<unknown>);
  }

  public emit<TKey extends keyof TEvents>(
    event: TKey,
    payload: TEvents[TKey],
  ): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }
}

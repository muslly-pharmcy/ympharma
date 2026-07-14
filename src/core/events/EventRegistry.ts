// ============================================================
// EventRegistry — in-process handler map
// ============================================================
import type {
  EventHandler,
  HandlerOptions,
  RegisteredHandler,
} from "./types";

const registry = new Map<string, RegisteredHandler[]>();

export function registerHandler<TPayload = unknown>(
  eventName: string,
  handler: EventHandler<TPayload>,
  options: HandlerOptions = {},
): () => void {
  const entry: RegisteredHandler = {
    eventName,
    handler: handler as EventHandler,
    options: {
      retries: options.retries ?? 3,
      baseDelayMs: options.baseDelayMs ?? 300,
      name: options.name ?? handler.name ?? "anonymous",
    },
  };
  const list = registry.get(eventName) ?? [];
  list.push(entry);
  registry.set(eventName, list);
  return () => {
    const cur = registry.get(eventName) ?? [];
    registry.set(
      eventName,
      cur.filter((h) => h !== entry),
    );
  };
}

export function getHandlers(eventName: string): RegisteredHandler[] {
  return registry.get(eventName) ?? [];
}

export function clearRegistry(): void {
  registry.clear();
}

export function listRegisteredEvents(): string[] {
  return [...registry.keys()];
}

import { useEffect } from "react";
import { useEventCallback } from "./event-callback";

export interface EventBus<T extends { kind: string }> {
  dispatch: (event: T) => void;
  subscribe: <K extends T["kind"]>(
    kind: K,
    handler: (event: T & { kind: K }) => void,
  ) => () => void;
}

export function createEventBus<T extends { kind: string }>(): EventBus<T> {
  const handlers = new Map<string, Set<(event: T) => void>>();
  const subscribe = (kind: string, handler: (event: T) => void) => {
    let kindHandlers = handlers.get(kind);
    if (kindHandlers == null) {
      kindHandlers = new Set();
      handlers.set(kind, kindHandlers);
    }
    kindHandlers.add(handler);
    return () => kindHandlers?.delete(handler);
  };
  const dispatch = (event: T) => {
    handlers.get(event.kind)?.forEach((handler) => handler(event));
  };

  return { dispatch, subscribe } as EventBus<T>;
}

export function useEvent<T extends { kind: string }, K extends T["kind"]>(
  bus: EventBus<T>,
  kind: K,
  handler: (event: T & { kind: K }) => void,
): void {
  const callback = useEventCallback(handler);
  useEffect(() => bus.subscribe(kind, callback), [bus, kind, callback]);
}

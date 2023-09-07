import { useLayoutEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/ban-types
export function useEventCallback<T extends Function>(fn: T): T {
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const callbackRef = useRef<T>(((...args: unknown[]) =>
    fnRef.current(...args)) as unknown as T);
  return callbackRef.current;
}

import React, { useLayoutEffect, useState } from "react";
import { useEventCallback } from "./event-callback";

const callbacks = new Map<Element, () => void>();

const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const cb = callbacks.get(entry.target);
    cb?.();
  }
});

export function useSize<T>(
  element: React.RefObject<Element | null>,
  mapFn: (width: number, height: number) => T,
): T | null {
  const [value, setValue] = useState<T | null>(null);
  const map = useEventCallback(mapFn);

  useLayoutEffect(() => {
    if (element.current == null) {
      setValue(null);
      return;
    }

    const elem = element.current;

    const updateSize = () => setValue(map(elem.clientWidth, elem.clientHeight));
    callbacks.set(elem, updateSize);
    observer.observe(elem);
    updateSize();

    return () => {
      observer.unobserve(elem);
      callbacks.delete(elem);
    };
  }, [element, map]);

  return value;
}

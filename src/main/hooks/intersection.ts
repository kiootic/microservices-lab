import React, { useLayoutEffect, useState } from "react";

const callbacks = new Map<Element, (isIntersecting: boolean) => void>();

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const cb = callbacks.get(entry.target);
      cb?.(entry.isIntersecting);
    }
  },
  { rootMargin: "-4px" },
);

export function useIntersection(
  element: React.RefObject<Element | null>,
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useLayoutEffect(() => {
    if (element.current == null) {
      return;
    }

    const elem = element.current;
    callbacks.set(elem, setIsIntersecting);
    observer.observe(elem);

    return () => {
      observer.unobserve(elem);
      callbacks.delete(elem);
    };
  }, [element]);

  return isIntersecting;
}

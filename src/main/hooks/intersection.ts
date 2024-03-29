import { useLayoutEffect, useState } from "react";

const callbacks = new Map<Element, (isIntersecting: boolean) => void>();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const cb = callbacks.get(entry.target);
    cb?.(entry.isIntersecting);
  }
});

export function useIntersection(element: Element | null): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useLayoutEffect(() => {
    if (element == null) {
      return;
    }

    const elem = element;
    callbacks.set(elem, setIsIntersecting);
    observer.observe(elem);

    return () => {
      observer.unobserve(elem);
      callbacks.delete(elem);
    };
  }, [element]);

  return isIntersecting;
}

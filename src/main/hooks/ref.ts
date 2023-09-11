import React, { ForwardedRef, useLayoutEffect, useRef } from "react";

interface SharedRef<T> extends React.RefObject<T> {
  (value: T | null): void;
}

interface MutableSharedRef<T> extends React.MutableRefObject<T | null> {
  forwardedRef: ForwardedRef<T>;
  (value: T | null): void;
}

function createSharedRef<T>(ref: ForwardedRef<T>): MutableSharedRef<T> {
  const sharedRef: MutableSharedRef<T> = Object.assign(
    (value: T | null) => {
      sharedRef.current = value;
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        ref.current = value;
      }
    },
    { forwardedRef: ref, current: null },
  );
  return sharedRef;
}

export function useForwardedRef<T>(ref: ForwardedRef<T>): SharedRef<T> {
  const sharedRef = useRef<MutableSharedRef<T> | null>(null);
  if (sharedRef.current == null) {
    sharedRef.current = createSharedRef(ref);
  }

  useLayoutEffect(() => {
    if (sharedRef.current !== null && sharedRef.current?.forwardedRef !== ref) {
      sharedRef.current.forwardedRef = ref;
      sharedRef.current(sharedRef.current.current);
    }
  }, [ref]);

  return sharedRef.current;
}

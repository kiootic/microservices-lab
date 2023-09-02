import { makePromise } from "./promise";

const microtaskQueue: Array<unknown> = [];

export const [Promise, internals] = makePromise(
  "ObservedPromise",
  (fn, arg) => {
    microtaskQueue.push(fn, arg);
  },
);

const NativePromise = globalThis.Promise;

let patched = false;
let isObserving = false;

export function observeMicrotasks<T>(fn: () => T): T {
  if (!patched) {
    Object.defineProperties(globalThis, {
      Promise: { get: () => (isObserving ? Promise : NativePromise) },
    });
    patched = true;
  }

  isObserving = true;
  try {
    return fn();
  } finally {
    isObserving = false;
  }
}

export function flushMicrotasks() {
  for (let i = 0; i < microtaskQueue.length; i += 2) {
    const fn = microtaskQueue[i] as (x: unknown) => void;
    const arg = microtaskQueue[i + 1];
    fn(arg);
  }
  microtaskQueue.length = 0;
}

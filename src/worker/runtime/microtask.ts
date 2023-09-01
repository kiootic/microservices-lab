import { Promise as _Promise } from "./promise";

const microtaskQueue: Array<unknown> = [];

class ObservedPromise extends _Promise {
  static schedule<T>(fn: (x: T) => void, arg: T) {
    microtaskQueue.push(fn, arg);
  }
}

const NativePromise = Promise;

let isObserving = false;
Object.defineProperties(globalThis, {
  Promise: { get: () => (isObserving ? ObservedPromise : NativePromise) },
});

export function observeMicrotasks<T>(fn: () => T): T {
  isObserving = true;
  try {
    return fn();
  } finally {
    isObserving = false;
  }
}

export function flushMicrotasks() {
  for (let i = 0; i < microtaskQueue.length; i += 2) {
    (microtaskQueue[i] as (x: unknown) => void)(microtaskQueue[i + 1]);
  }
  microtaskQueue.length = 0;
}

import { makePromise } from "./promise";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Zone {
    interface Context {}
  }
}

let currentZone: Zone | null = null;

export const [ZonePromise, internals] = makePromise(
  "ZonePromise",
  () => currentZone,
  (zone, fn, arg) => zone!.scheduleMicrotask(fn, arg),
);

let isPromisePatched = false;
function patchPromise() {
  if (!isPromisePatched) {
    const NativePromise = globalThis.Promise;
    Object.defineProperties(globalThis, {
      Promise: {
        get: () => (currentZone != null ? ZonePromise : NativePromise),
      },
    });
    isPromisePatched = true;
  }
}

export abstract class Zone {
  static root: Zone;

  static get current(): Zone | null {
    return currentZone;
  }

  static run<T>(fn: () => T): T {
    return this.root.run(fn);
  }

  static runOutside<T>(fn: () => T): T {
    const oldZone = currentZone;
    currentZone = null;
    try {
      return fn();
    } finally {
      currentZone = oldZone;
    }
  }

  static flush() {
    root.flushMicrotasks();
  }

  static {
    patchPromise();
  }

  readonly name: string;
  readonly context: Partial<Zone.Context>;

  constructor(name: string, context: Partial<Zone.Context>) {
    this.name = name;
    this.context = context;
  }

  abstract scheduleMicrotask<T>(fn: (x: T) => void, arg: T): void;

  run<T>(fn: () => T): T {
    const oldZone = currentZone;
    // False positive:
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    currentZone = this;
    try {
      return fn();
    } finally {
      currentZone = oldZone;
    }
  }
}

export class MicrotaskQueue {
  private readonly owner: Zone;
  private readonly microtasks: Array<unknown> = [];

  constructor(owner: Zone) {
    this.owner = owner;
  }

  get isEmpty(): boolean {
    return this.microtasks.length === 0;
  }

  flush() {
    const oldZone = currentZone;
    currentZone = this.owner;
    try {
      for (let i = 0; i < this.microtasks.length; i += 2) {
        const fn = this.microtasks[i] as (x: unknown) => void;
        const arg = this.microtasks[i + 1];
        fn(arg);
      }
      this.microtasks.length = 0;
    } finally {
      currentZone = oldZone;
    }
  }

  schedule<T>(fn: (x: T) => void, arg: T): void {
    if (Zone.current == null) {
      throw new Error("Attempt to schedule outside zone");
    }
    this.microtasks.push(fn, arg);
  }
}

class RootZone extends Zone {
  private readonly queue = new MicrotaskQueue(this);

  constructor() {
    super("root", {});
  }

  scheduleMicrotask<T>(fn: (x: T) => void, arg: T): void {
    this.queue.schedule(fn, arg);
  }

  flushMicrotasks() {
    this.queue.flush();
  }
}

const root = new RootZone();
Zone.root = root;

import { Heap } from "../utils/heap";
import { Zone, internals } from "./zone";

const yieldIntervalMS = 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Timer<T = any> {
  id: number;
  runNotBefore: number;
  complete: (arg: T) => void;
  arg: T;
}

function completeTimerMicrotaskPromise(arg: Promise<void>) {
  internals.resolve(arg, undefined);
}

function completeTimerCallback(fn: () => void) {
  fn();
}

function settle<T>(promise: Promise<T>): () => T {
  let result: (() => T) | null = null;
  promise.then(
    (value) => {
      result = () => value;
    },
    (reason) => {
      result = () => {
        throw reason;
      };
    },
  );

  return () => {
    if (result == null) {
      throw new EvalError("Execution not settled");
    }
    return result();
  };
}

export class Scheduler {
  static readonly epoch = new Date("1984-07-01T02:00:00Z");

  private nextID = 1;
  private time = 0;
  private readonly heap = new Heap();
  private readonly timers = new Map<number, Timer>();

  private readonly now = (): number => Scheduler.epoch.getTime() + this.time;

  readonly Date = new Proxy(Date, {
    apply: () => {
      return new Date(this.now()).toString();
    },
    construct: (Date, args: unknown[]) => {
      if (args.length === 0) {
        return new Date(this.now());
      }
      return new (Date as new (...args: unknown[]) => Date)(...args);
    },
    get: (Date, p) => {
      if (p === "now") {
        return this.now;
      }
      return Date[p as keyof typeof Date];
    },
  });

  get currentTime(): number {
    return this.time;
  }

  schedule<T>(
    runNotBefore: number,
    complete: (arg: T) => void,
    arg: T,
  ): number {
    const timer: Timer<T> = { id: this.nextID++, runNotBefore, complete, arg };
    this.timers.set(timer.id, timer);
    this.heap.push(timer.runNotBefore, timer.id);
    return timer.id;
  }

  unschedule(id: number): void {
    this.timers.delete(id);
  }

  setTimeout(
    handler: (...args: unknown[]) => void,
    timeout?: number,
    ...args: unknown[]
  ): number {
    timeout = Math.max(0, timeout ?? 0);
    const runNotBefore = this.time + timeout;
    const fn = handler.bind(null, ...args);
    return this.schedule(runNotBefore, completeTimerCallback, fn);
  }

  clearTimeout(handle: number): void {
    this.unschedule(handle);
  }

  delay(ms?: number): Promise<void> {
    ms = Math.max(0, ms ?? 0);
    const runNotBefore = this.time + ms;
    const promise = internals.make<void>();
    this.schedule(runNotBefore, completeTimerMicrotaskPromise, promise);
    return promise;
  }

  reset(): Promise<void> {
    const promise = internals.make<void>();
    this.setTimeout(() => {
      Zone.flush();
      this.nextID = 0;
      this.time = 0;
      this.heap.clear();
      this.timers.clear();
      internals.resolve(promise, undefined);
    }, 0);
    return promise;
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    return this.runMicrotasks(fn);
  }

  private runTimer(): boolean {
    let nextID = this.heap.pop();
    let timer: Timer | undefined;
    while (nextID != null && (timer = this.timers.get(nextID)) == null) {
      nextID = this.heap.pop();
    }
    if (timer == null) {
      return false;
    }

    this.timers.delete(timer.id);
    this.time = Math.max(this.time, timer.runNotBefore);
    timer.complete(timer.arg);
    return true;
  }

  private async runMicrotasks<T>(fn: () => Promise<T>): Promise<T> {
    const result = Zone.run(() => {
      const result = settle(fn());
      Zone.flush();
      return result;
    });

    let lastYield = Date.now();
    const yieldToHost = () =>
      new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

    const tick = () => {
      while (this.runTimer()) {
        Zone.flush();
        if (Date.now() - lastYield > yieldIntervalMS) {
          return true;
        }
      }
      return false;
    };

    while (Zone.root.run(tick)) {
      await yieldToHost();
      lastYield = Date.now();
    }

    return result();
  }
}

import { Heap } from "../utils/heap";
import { flushMicrotasks, observeMicrotasks, internals } from "./microtask";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Timer<T = any> {
  id: number;
  runNotBefore: number;
  complete: (arg: T) => void;
  arg: T;
}

function completeTimerPromise(arg: Promise<void>) {
  internals.resolve(arg, undefined);
}

function completeTimerCallback(fn: () => void) {
  fn();
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
    construct: (Date, args) => {
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

  constructor() {}

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
    this.schedule(runNotBefore, completeTimerPromise, promise);
    return promise;
  }

  reset(): void {
    this.nextID = 0;
    this.time = 0;
    this.heap.clear();
    this.timers.clear();
  }

  run<T>(fn: () => Promise<T>): T {
    return observeMicrotasks(() => {
      let result: { ok: boolean; value: unknown } | undefined;
      fn().then(
        (value) => {
          result = { ok: true, value };
        },
        (reason) => {
          result = { ok: false, value: reason };
        },
      );

      flushMicrotasks();
      while (this.timers.size > 0) {
        let nextID = this.heap.pop();
        let timer: Timer | undefined;
        while (nextID != null && (timer = this.timers.get(nextID)) == null) {
          nextID = this.heap.pop();
        }
        if (timer == null) {
          continue;
        }

        this.timers.delete(timer.id);
        this.time = Math.max(this.time, timer.runNotBefore);
        timer.complete(timer.arg);

        flushMicrotasks();
      }

      if (result == null) {
        throw new EvalError("Execution not settled");
      } else if (!result.ok) {
        throw result.value;
      }
      return result.value as T;
    });
  }
}

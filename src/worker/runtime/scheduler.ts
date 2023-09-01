import { Heap } from "../utils/heap";
import { flushMicrotasks, observeMicrotasks } from "./microtask";

interface Timer {
  id: number;
  runNotBefore: number;
  fn: () => void;
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
      return Reflect.construct(Date, args);
    },
    get: (Date, p) => {
      if (p === "now") {
        return this.now;
      }
      return Reflect.get(Date, p);
    },
  });

  constructor() {}

  get currentTime(): number {
    return this.time;
  }

  schedule(runNotBefore: number, fn: () => void): number {
    const timer: Timer = { id: this.nextID++, runNotBefore, fn };
    this.timers.set(timer.id, timer);
    this.heap.push(timer.runNotBefore, timer.id);
    return timer.id;
  }

  unschedule(id: number): void {
    this.timers.delete(id);
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
        timer.fn?.();

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

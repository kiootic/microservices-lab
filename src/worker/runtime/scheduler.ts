import { Heap } from "../utils/heap";

interface Timer {
  id: number;
  runNotBefore: number;
  fn: () => void;
}

let nextYieldID = 1;
const yieldTasks = new Map<number, () => void>();
const yieldChannel = new MessageChannel();
yieldChannel.port1.onmessage = (e) => {
  const id: number = e.data;
  yieldTasks.get(id)?.();
  yieldTasks.delete(id);
};

function yieldNext() {
  return new Promise<void>((resolve) => {
    const id = nextYieldID++;
    yieldTasks.set(id, resolve);
    yieldChannel.port2.postMessage(id);
  });
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

  async run(): Promise<void> {
    await yieldNext();
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

      await yieldNext();
    }
  }
}

import { useCallback, useMemo, useSyncExternalStore } from "react";

class Timer {
  token = {};

  private readonly granularity: number;
  private readonly callbacks = new Set<() => void>();
  private isRunning = false;
  private handle: number | null = null;

  constructor(granularity: number) {
    this.granularity = granularity;
  }

  subscribe(callback: () => void): () => void {
    if (this.callbacks.size === 0) {
      this.start();
    }
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.stop();
      }
    };
  }

  private start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    const handler = () => {
      this.token = {};
      this.callbacks.forEach((cb) => cb());
    };
    handler();
    this.handle = setInterval(handler, this.granularity);
  }

  private stop() {
    if (this.handle != null) {
      clearInterval(this.handle);
      this.handle = null;
    }
    this.isRunning = false;
  }
}

const timers = new Map<number, Timer>();

export function useTimer(granularity: "minute"): Date {
  let granularityMS: number;
  switch (granularity) {
    case "minute":
      granularityMS = 60 * 1000;
      break;
  }

  const timer = useMemo(() => {
    let timer = timers.get(granularityMS);
    if (timer == null) {
      timer = new Timer(granularityMS);
      timers.set(granularityMS, timer);
    }
    return timer;
  }, [granularityMS]);

  useSyncExternalStore(
    useCallback((cb) => timer.subscribe(cb), [timer]),
    useCallback(() => timer.token, [timer]),
  );

  return new Date();
}

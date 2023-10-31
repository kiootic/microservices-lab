import { Scheduler } from "../runtime/scheduler";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class Semaphore {
  private readonly queue: Array<[n: number, acquire: () => void]> = [];
  private count = 0;
  readonly max: number;

  get active(): number {
    return this.count;
  }

  get pending(): number {
    return this.queue.length;
  }

  constructor(max: number) {
    this.max = max;
  }

  tryAcquire(n: number): boolean {
    if (this.count + n <= this.max) {
      this.count += n;
      return true;
    }
    return false;
  }

  acquire(n: number): Promise<void> {
    const acquire = deferred<void>();
    if (this.count + n <= this.max) {
      this.count += n;
      acquire.resolve();
    } else {
      this.queue.push([n, acquire.resolve]);
    }
    return acquire.promise;
  }

  release(n: number): void {
    this.count -= n;
    if (this.queue.length > 0) {
      const [n, acquire] = this.queue[0];
      if (this.count + n <= this.max) {
        this.queue.shift();
        this.count += n;
        acquire();
      }
    }
  }

  async run<T>(n: number, fn: () => Promise<T>): Promise<T> {
    await this.acquire(n);
    try {
      return await fn();
    } finally {
      this.release(n);
    }
  }
}

class TimeoutError extends Error {
  get name() {
    return "TimeoutError";
  }

  constructor() {
    super("Task timed out");
  }
}

const timeoutToken = Symbol();
export function timeout<T>(
  scheduler: Scheduler,
  task: Promise<T>,
  timeoutMS: number,
): Promise<T> {
  let timeoutHandle: number = 0;
  return Promise.race([
    task,
    new Promise<typeof timeoutToken>((resolve) => {
      timeoutHandle = scheduler.setTimeout(
        resolve as () => void,
        timeoutMS,
        timeoutToken,
      );
    }),
  ]).then((result) => {
    if (result === timeoutToken) {
      throw new TimeoutError();
    } else {
      scheduler.clearTimeout(timeoutHandle);
      return result;
    }
  });
}

export async function retryOnError<T>(
  fn: (retryCount: number) => Promise<T>,
  maxRetry: number,
  shouldRetry?: (err: unknown) => boolean,
) {
  let retryCount = 0;
  let err: unknown = null;
  do {
    try {
      return await fn(retryCount);
    } catch (e) {
      err = e;

      if (shouldRetry != null && !shouldRetry(err)) {
        break;
      }
      retryCount++;
    }
  } while (retryCount <= maxRetry);
  throw err;
}

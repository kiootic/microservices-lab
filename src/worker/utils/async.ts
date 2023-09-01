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

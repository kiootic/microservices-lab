declare const console: {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

declare function delay(ms: number): Promise<void>;

declare const expect: jest.Expect;

interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

interface VirtualUser {
  readonly id: number;
  readonly log: Logger;
}

interface Test {
  users(numUsers: number): this;
  setup(fn: () => Promise<void>): this;
  teardown(fn: () => Promise<void>): this;
  run(fn: (user: VirtualUser) => Promise<void>): this;
}

declare function defineTest(name: string): Test;
declare function runTests(): Promise<number>;

type ServiceTypeMap<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Ret
    ? Ret extends PromiseLike<infer V>
      ? (...args: Args) => Promise<V>
      : (...args: Args) => Promise<Ret>
    : never;
};

interface SystemServices {}

type ServicesType<T extends Record<string, PromiseLike<ServiceModule>>> = {
  [K in keyof T]: ServiceTypeMap<ReturnType<Awaited<T[K]>["instance"]>>;
};

interface ServiceModule {
  instance: (hostID: number) => Record<string, unknown>;
}

declare function defineServices<
  T extends Record<string, Promise<ServiceModule>>,
>(services: T): T;
declare function setupSystem(): Promise<void>;
declare const services: SystemServices;

interface Random {
  uniform(): number;
  normal(): number;
  choice<T>(list: T[]): T | null;
}
declare const random: Random;

declare class Semaphore {
  readonly max: number;
  readonly active: number;
  readonly pending: number;

  constructor(max: number);
  tryAcquire(n: number): boolean;
  acquire(n: number): Promise<void>;
  release(n: number): void;
  async run<T>(n: number, fn: () => Promise<T>): Promise<T>;
}

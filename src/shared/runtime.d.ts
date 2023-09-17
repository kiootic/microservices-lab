const console: {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

function delay(ms: number): Promise<void>;

const expect: import("@vitest/expect").ExpectStatic;

interface SystemServices {}
const services: SystemServices;

const random: Runtime.Random;

interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

namespace Runtime {
  export interface VirtualUser {
    readonly id: number;
    readonly log: Logger;
  }

  export interface Test {
    users(numUsers: number): this;
    setup(fn: () => Promise<void>): this;
    teardown(fn: () => Promise<void>): this;
    run(fn: (user: VirtualUser) => Promise<void>): this;
  }

  export function defineTest(name: string): Test;
  export function runTests(): Promise<number>;
}

namespace Runtime {
  type ServiceTypeMap<T> = {
    [K in keyof T]: T[K] extends (...args: infer Args) => infer Ret
      ? Ret extends PromiseLike<infer V>
        ? (...args: Args) => Promise<V>
        : (...args: Args) => Promise<Ret>
      : never;
  };

  export type ServicesType<
    T extends Record<string, PromiseLike<ServiceModule>>,
  > = {
    [K in keyof T]: ServiceTypeMap<ReturnType<Awaited<T[K]>["instance"]>>;
  };

  interface ServiceModule {
    instance: (hostID: number) => Record<string, unknown>;
  }

  export function defineServices<
    T extends Record<string, Promise<ServiceModule>>,
  >(services: T): T;
  export function setupSystem(): Promise<void>;
}

namespace Runtime {
  export interface Random {
    uniform(): number;
    normal(): number;
    choice<T>(list: T[]): T | null;
  }

  export class Semaphore {
    readonly max: number;
    readonly active: number;
    readonly pending: number;

    constructor(max: number);
    tryAcquire(n: number): boolean;
    acquire(n: number): Promise<void>;
    release(n: number): void;
    async run<T>(n: number, fn: () => Promise<T>): Promise<T>;
  }
}

// MARKER: exports

export { console, delay, expect, services, random, Runtime };

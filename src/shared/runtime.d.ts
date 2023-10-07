const console: {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

function logger(name: string): Logger;

function delay(ms: number): Promise<void>;

const expect: import("@vitest/expect").ExpectStatic;

function Service<Name extends string>(
  name: Name,
): Runtime.ServiceConstructor<Name>;

interface SystemServices {}
const services: SystemServices;

const random: Runtime.Random;

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
  export function runTests(): Promise<void>;
}

namespace Runtime {
  abstract class Service {
    static readonly __name: string;

    readonly nodeID: string;
    readonly logger: Logger;

    constructor(ctx: unknown);
  }

  interface ServiceConstructor<Name extends string = string> {
    readonly __name: Name;
    new (ctx: unknown): Service;
  }

  type ServiceFunctions<T extends Service> = {
    [K in keyof Omit<T, keyof Service>]: T[K] extends (
      ...args: infer Args
    ) => infer Ret
      ? (...args: Args) => Promise<Awaited<Ret>>
      : T[K];
  };
  export type ServiceType<T extends ServiceConstructor> = {
    [K in T["__name"]]: ServiceFunctions<InstanceType<T>>;
  };

  export function defineService<T extends ServiceConstructor>(service: T): void;

  export function setupSystem(): void;
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

export { console, logger, delay, expect, Service, services, random, Runtime };

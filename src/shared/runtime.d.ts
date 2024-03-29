const console: {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

function logger(name: string): Runtime.Logger;

const metrics: Runtime.MetricFactory;

function setTimeout(
  handler: (...args: unknown[]) => void,
  timeout?: number,
  ...args: unknown[]
): number;

function clearTimeout(handle: number): void;

function delay(ms: number): Promise<void>;
function spin(ms: number): Promise<void>;

const expect: import("@vitest/expect").ExpectStatic;

function Service<Name extends string>(
  name: Name,
): Runtime.ServiceConstructor<Name>;

interface SystemServices {}
const services: SystemServices;

const random: Runtime.Random;

const context: Runtime.Context;

interface Config {
  system: Runtime.SystemConfig;
}

namespace Runtime {
  export interface Task {
    id: number;
    nodeID: string | null;
    service: string;
    fn: string;
  }

  export interface Context {
    readonly task?: Task;
    readonly caller?: Task;
  }
}

namespace Runtime {
  export interface VirtualUser {
    readonly id: number;
    readonly log: Logger;
  }

  export interface Test {
    users(numUsers: number): this;
    fallible(): this;
    setup(fn: () => void | Promise<void>): this;
    teardown(fn: () => void | Promise<void>): this;
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
    readonly replicas: number;
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
    exponential(): number;
    erlang(k: number): number;
    pareto(alpha: number): number;
    choice<T>(list: T[]): T | null;
  }
}

namespace Runtime {
  export interface Logger {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
  }

  export type MetricsLabel = Record<string, string>;

  export interface MetricVec<T> {
    get(labelValue: string): T;
  }

  export interface MetricCounter {
    withLabels(labels: MetricsLabel): this;
    vec(labelName: string): MetricVec<MetricCounter>;
    add(increase: number): void;
    increment(): void;
  }

  export interface MetricGauge {
    withLabels(labels: MetricsLabel): this;
    vec(labelName: string): MetricVec<MetricGauge>;
    set(value: number): void;
    add(increase: number): void;
    subtract(decrease: number): void;
    increment(): void;
    decrement(): void;
  }

  export interface MetricHistogram {
    withLabels(labels: MetricsLabel): this;
    vec(labelName: string): MetricVec<MetricHistogram>;
    observe(value: number): void;
  }

  export interface MetricFactory {
    counter(name: string, labels?: MetricsLabel): MetricCounter;
    gauge(name: string, labels?: MetricsLabel): MetricGauge;
    histogram(name: string, labels?: MetricsLabel): MetricHistogram;
  }
}

namespace Runtime {
  export interface SystemConfig {
    onInvoke(
      interceptor: (next: () => Promise<unknown>) => () => Promise<unknown>,
    );

    adjustServicePerformance(service: string, factor: number): void;
  }

  export function defineConfig<K extends string, V>(
    name: K,
    value: V,
  ): V & { __name?: K };

  export function configure<K extends keyof Config>(
    name: K,
    fn: (value: Config[K]) => void,
  ): void;

  export type ConfigType<T extends { [__name]?: string }> = {
    [K in T["__name"]]: Omit<T, "__name">;
  };
}

namespace utils {
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

  export function timeout<T>(task: Promise<T>, timeoutMS: number): Promise<T>;
  export function retryOnError<T>(
    fn: (retryCount: number) => Promise<T>,
    maxRetry: number,
    shouldRetry?: (err: unknown) => boolean,
  ): Promise<T>;
}

// MARKER: exports

export {
  console,
  logger,
  metrics,
  delay,
  spin,
  setTimeout,
  clearTimeout,
  expect,
  Service,
  services,
  random,
  context,
  Config,
  Runtime,
  utils,
};

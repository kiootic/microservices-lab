export const console: {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export const Date: DateConstructor;

export function setTimeout(
  handler: Function, // eslint-disable-line @typescript-eslint/ban-types
  timeout?: number,
  ...args: unknown[]
): number;
export function clearTimeout(id: number): void;
export function delay(ms: number): Promise<void>;

export const expect: jest.Expect;

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

export function defineTest(name: string): Test;
export function runTests(): Promise<number>;

interface ServiceModule {
  instance: (hostID: number) => Record<string, unknown>;
}

export function defineServices<
  T extends Record<string, Promise<ServiceModule>>,
>(services: T): T;
export function setupSystem(): Promise<void>;
export const services: unknown;

interface Random {
  uniform(): number;
  normal(): number;
  choice<T>(list: T[]): T | null;
}
export const random: Random;

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

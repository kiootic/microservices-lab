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
export function runTests(): Promise<void>;

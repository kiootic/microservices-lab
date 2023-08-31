declare const console: {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

declare const Date: DateConstructor;

declare function setTimeout(
  handler: Function, // eslint-disable-line @typescript-eslint/ban-types
  timeout?: number,
  ...args: unknown[]
): number;
declare function clearTimeout(id: number): void;
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
declare function runTests(): Promise<void>;

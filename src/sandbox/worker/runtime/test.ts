import { Runtime } from "./runtime";
import { Logger, LoggerFactory } from "./logger";
import {
  JestExtend,
  JestChaiExpect,
  JestAsymmetricMatchers,
  ExpectStatic,
  GLOBAL_EXPECT,
  setState,
} from "@vitest/expect";
import chai, { expect as chaiExpect } from "chai";

chai.use(JestExtend);
chai.use(JestChaiExpect);
chai.use(JestAsymmetricMatchers);

export const expect: ExpectStatic = chaiExpect as ExpectStatic;
Object.defineProperty(globalThis, GLOBAL_EXPECT, { value: expect });
setState({}, expect);

export class VirtualUser {
  readonly id: number;
  readonly log: Logger;

  constructor(id: number, logger: LoggerFactory) {
    this.id = id;
    this.log = logger.make(`user #${id}`);
  }
}

type TestFn = (user: VirtualUser) => Promise<void>;

class Test {
  readonly name: string;
  numUsers = 1;
  setupFn?: () => Promise<void>;
  teardownFn?: () => Promise<void>;
  testFn?: TestFn;

  constructor(name: string) {
    this.name = name;
  }

  users(numUsers: number): this {
    this.numUsers = numUsers;
    return this;
  }

  setup(fn: () => Promise<void>): this {
    this.setupFn = fn;
    return this;
  }

  teardown(fn: () => Promise<void>): this {
    this.teardownFn = fn;
    return this;
  }

  run(fn: TestFn): this {
    this.testFn = fn;
    return this;
  }
}

export class Suite {
  readonly tests: Test[] = [];
  readonly setupFns: Array<() => Promise<void>> = [];
  readonly runtime: Runtime;
  readonly log: Logger;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
    this.log = runtime.logger.make("test");
  }

  defineTest(name: string): Test {
    const test = new Test(name);
    this.tests.push(test);
    return test;
  }

  addSetupFn(fn: () => Promise<void>): void {
    this.setupFns.push(fn);
  }

  async run(): Promise<number> {
    const start = performance.now();
    for (const test of this.tests) {
      this.log.info(`running test: ${test.name}`);

      for (const fn of this.setupFns) {
        await fn();
      }
      await test.setupFn?.();

      const threads = new Array(test.numUsers).fill(0).map(async (_, i) => {
        const user = new VirtualUser(i + 1, this.runtime.logger);
        await Promise.resolve();
        try {
          await test.testFn?.(user);
        } catch (err) {
          this.log.error(`test failed for user ${user.id}:`, err);
        }
      });
      await Promise.allSettled(threads);
      await test.teardownFn?.();
    }

    const end = performance.now();
    const elaspsed = (end - start) / 1000;
    this.log.info(`all tests completed; time taken: ${elaspsed.toFixed(2)}s`);
    return elaspsed;
  }
}

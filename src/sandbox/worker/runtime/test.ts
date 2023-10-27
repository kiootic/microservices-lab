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
import { TaskZone } from "../system/task";

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
    this.log = logger.make(`vu/${id}`);
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

class TestError extends Error {
  readonly vu: number;
  constructor(cause: unknown, vu: number) {
    super("Test failed", { cause });
    this.vu = vu;
  }
}

export class Suite {
  readonly tests: Test[] = [];
  readonly setupFns: Array<() => void | Promise<void>> = [];
  readonly runtime: Runtime;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
  }

  defineTest(name: string): Test {
    const test = new Test(name);
    this.tests.push(test);
    return test;
  }

  addSetupFn(fn: () => void | Promise<void>): void {
    this.setupFns.push(fn);
  }

  async run(): Promise<void> {
    const start = performance.now();
    let count = 0;
    let pass = 0;
    for (const test of this.tests) {
      this.runtime.logger.main.info("Running test...", {
        test: test.name,
        vus: test.numUsers,
      });
      count++;

      this.runtime.metrics.store.setOwnerKey(test.name);

      for (const fn of this.setupFns) {
        await fn();
      }
      await test.setupFn?.();

      try {
        const threads = new Array(test.numUsers).fill(0).map(async (_, i) => {
          const user = new VirtualUser(i + 1, this.runtime.logger);
          const zone = new TaskZone(null, null, `vu/${user.id}`);
          await Promise.resolve();
          try {
            await zone.run(() => test.testFn?.(user));
          } catch (err) {
            throw new TestError(err, user.id);
          }
        });
        await Promise.all(threads);
        this.runtime.logger.main.debug("Test passed.", { test: test.name });
        pass++;
      } catch (err) {
        const context: Record<string, unknown> = {};
        context.test = test.name;
        if (err instanceof TestError) {
          context.vu = err.vu;
          context.error = err.cause;
        } else {
          context.error = err;
        }
        this.runtime.logger.main.error("Test failed.", context);
      } finally {
        await this.runtime.scheduler.reset();
        await test.teardownFn?.();
      }
    }

    const end = performance.now();
    const elaspsed = (end - start) / 1000;
    if (pass === count) {
      this.runtime.logger.main.info("All tests passed.", {
        elapsed: elaspsed,
      });
    }
  }
}

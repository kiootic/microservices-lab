import type * as RuntimeGlobals from "../../shared/runtime";
import { Host } from "./host";
import { LoggerFactory } from "./logger";
import { Scheduler } from "./scheduler";
import { Suite, expect } from "./test";

function makeGlobals(runtime: Runtime): typeof RuntimeGlobals {
  const console = runtime.logger.make("console");
  const suite = new Suite(runtime);

  return {
    console: {
      debug: console.debug,
      log: console.info,
      warn: console.warn,
      error: console.error,
    },
    Date: runtime.scheduler.Date,
    // eslint-disable-next-line @typescript-eslint/ban-types
    setTimeout: (handler: Function, timeout?: number, ...args: unknown[]) => {
      timeout = Math.max(0, timeout ?? 0);
      const runNotBefore = runtime.scheduler.currentTime + timeout;
      const fn = handler.bind(null, ...args);
      return runtime.scheduler.schedule(runNotBefore, fn);
    },
    clearTimeout: (id: number) => runtime.scheduler.unschedule(id),
    delay: (ms: number) =>
      new Promise<void>((resolve) => {
        const runNotBefore = runtime.scheduler.currentTime + ms;
        runtime.scheduler.schedule(runNotBefore, resolve);
      }),

    expect,
    defineTest: suite.defineTest.bind(suite),
    runTests: suite.run.bind(suite),
  };
}

export class Runtime {
  readonly host: Host;

  readonly logger: LoggerFactory;
  readonly scheduler: Scheduler;

  readonly globals: typeof RuntimeGlobals;

  constructor(host: Host) {
    this.host = host;
    this.logger = new LoggerFactory(host);
    this.scheduler = new Scheduler();

    this.globals = makeGlobals(this);
  }
}

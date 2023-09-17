import type * as RuntimeGlobals from "../../../shared/runtime";
import { VirtualNetwork } from "../system/network";
import { System } from "../system/system";
import { Semaphore } from "../utils/async";
import { random } from "../utils/random";
import { Host } from "./host";
import { LoggerFactory, formatConsoleLog } from "./logger";
import { Scheduler } from "./scheduler";
import { Suite, expect } from "./test";

function makeGlobals(runtime: Runtime): typeof RuntimeGlobals {
  const console = runtime.logger.make("console");
  const system = new System();
  const suite = new Suite(runtime);

  suite.addSetupFn(async () => {
    runtime.scheduler.reset();
    await system.reset();
  });

  const globalOverrides: Partial<Record<keyof typeof globalThis, unknown>> = {
    Date: runtime.scheduler.Date,
    setTimeout: runtime.scheduler.setTimeout.bind(runtime.scheduler),
    clearTimeout: runtime.scheduler.clearTimeout.bind(runtime.scheduler),
  };

  return {
    ...globalOverrides,
    console: {
      debug: (...args) => formatConsoleLog(console.debug, args),
      log: (...args) => formatConsoleLog(console.info, args),
      warn: (...args) => formatConsoleLog(console.warn, args),
      error: (...args) => formatConsoleLog(console.error, args),
    },
    delay: runtime.scheduler.delay.bind(runtime.scheduler),

    expect,
    random: random,
    services: VirtualNetwork.proxy(() => system.network),

    Runtime: {
      defineTest: suite.defineTest.bind(suite),
      runTests: suite.run.bind(suite),

      defineServices: system.defineServices.bind(system),
      setupSystem: system.setup.bind(system),

      Semaphore: Semaphore,
    },
  };
}

export class Runtime {
  readonly host: Host;

  readonly scheduler: Scheduler;
  readonly logger: LoggerFactory;

  readonly globals: typeof RuntimeGlobals;

  constructor(host: Host) {
    this.host = host;
    this.scheduler = new Scheduler();
    this.logger = new LoggerFactory(host, this.scheduler);

    this.globals = makeGlobals(this);
  }
}

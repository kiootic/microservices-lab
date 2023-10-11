import type * as RuntimeGlobals from "../../../shared/runtime";
import { VirtualNetwork } from "../system/network";
import { Service, ServiceConstructor } from "../system/service";
import { System } from "../system/system";
import { Semaphore } from "../utils/async";
import { random } from "../utils/random";
import { Host } from "./host";
import { LoggerFactory, formatConsoleLog } from "./logger";
import { MetricsManager } from "./metrics";
import { Scheduler } from "./scheduler";
import { Suite, expect } from "./test";

function makeGlobals(runtime: Runtime): typeof RuntimeGlobals {
  const console = runtime.logger.make("console");
  const system = new System(runtime);
  const suite = new Suite(runtime);

  suite.addSetupFn(() => {
    system.reset();
    random.reset();
  });

  const math = Object.create(Math) as typeof Math;
  Object.defineProperty(math, "random", { value: random.uniform });

  const globalOverrides: Partial<Record<keyof typeof globalThis, unknown>> = {
    Date: runtime.scheduler.Date,
    Math: math,
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
    logger: runtime.logger.make.bind(runtime.logger),
    metrics: runtime.metrics.factory,
    delay: runtime.scheduler.delay.bind(runtime.scheduler),

    expect,
    random: random,
    Service: <Name extends string>(name: Name) =>
      class extends Service {
        static readonly __name = name;
      } satisfies ServiceConstructor<Name> as never,
    services: VirtualNetwork.proxy(() => system.network),

    Runtime: {
      defineTest: suite.defineTest.bind(suite),
      runTests: suite.run.bind(suite),

      Service,
      defineService: system.defineService.bind(system),
      setupSystem: system.setup.bind(system),

      Semaphore: Semaphore,
    },
  };
}

export class Runtime {
  readonly host: Host;

  readonly scheduler: Scheduler;
  readonly logger: LoggerFactory;
  readonly metrics: MetricsManager;

  readonly globals: typeof RuntimeGlobals;

  constructor(host: Host) {
    this.host = host;
    this.scheduler = new Scheduler();
    this.logger = new LoggerFactory(host, this.scheduler);
    this.metrics = new MetricsManager(host, this.scheduler);

    this.globals = makeGlobals(this);
  }

  dispose() {
    this.metrics.dispose();
  }
}

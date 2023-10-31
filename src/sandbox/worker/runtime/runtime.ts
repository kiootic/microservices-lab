import type * as RuntimeGlobals from "../../../shared/runtime";
import { VirtualNetwork } from "../system/network";
import { Service, ServiceConstructor } from "../system/service";
import { System } from "../system/system";
import { TaskZone } from "../system/task";
import { Semaphore, retryOnError, timeout } from "../utils/async";
import { random } from "../utils/random";
import { Hooks } from "./hooks";
import { Host } from "./host";
import { LoggerFactory, formatConsoleLog } from "./logger";
import { MetricsManager } from "./metrics";
import { Scheduler } from "./scheduler";
import { Suite, expect } from "./test";
import { Zone } from "./zone";

function makeGlobals(runtime: Runtime): typeof RuntimeGlobals {
  const console = runtime.logger.make("console");
  const system = new System(runtime);
  const suite = new Suite(runtime);

  suite.addResetFn(async () => {
    system.reset();
    random.reset();
    await runtime.scheduler.reset();
  });

  const math = Object.create(Math) as typeof Math;
  Object.defineProperty(math, "random", { value: random.uniform });

  const globalOverrides: Partial<Record<keyof typeof globalThis, unknown>> = {
    Date: runtime.scheduler.Date,
    Math: math,
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
    setTimeout: runtime.scheduler.setTimeout.bind(runtime.scheduler),
    clearTimeout: runtime.scheduler.clearTimeout.bind(runtime.scheduler),
    delay: runtime.scheduler.delay.bind(runtime.scheduler),
    spin: (ms) => {
      const zone = Zone.current;
      if (zone instanceof TaskZone) {
        return zone.spin(ms);
      }
      return Promise.resolve();
    },

    expect,
    random: random,
    Service: <Name extends string>(name: Name) =>
      class extends Service {
        static readonly __name = name;
      } satisfies ServiceConstructor<Name> as never,
    services: VirtualNetwork.proxy(() => system.network),

    get context() {
      return Zone.current?.context ?? {};
    },
    get hooks() {
      return runtime.hooks.hooks;
    },

    Runtime: {
      defineTest: suite.defineTest.bind(suite),
      runTests: suite.run.bind(suite),

      Service,
      defineService: system.defineService.bind(system),
      setupSystem: system.setup.bind(system),

      registerHook: runtime.hooks.registerHook.bind(runtime.hooks),
    },

    utils: {
      Semaphore,
      timeout: (task, timeoutMS) => timeout(runtime.scheduler, task, timeoutMS),
      retryOnError,
    },
  };
}

export class Runtime {
  readonly host: Host;

  readonly scheduler: Scheduler;
  readonly logger: LoggerFactory;
  readonly metrics: MetricsManager;
  readonly hooks = new Hooks<import("../../../shared/runtime").Hooks>();

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

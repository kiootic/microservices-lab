import { RuntimeModule } from "../../shared/runtime";
import { Host } from "./host";
import { LoggerFactory } from "./logger";
import { Scheduler } from "./scheduler";

function makeGlobals(runtime: Runtime): object {
  const console = runtime.logger.make("console");

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
      const runNotBefore = runtime.scheduler.now() + timeout;
      const fn = handler.bind(null, ...args);
      return runtime.scheduler.schedule(runNotBefore, fn);
    },
    clearTimeout: (id: number) => runtime.scheduler.unschedule(id),

    delay: (ms: number) =>
      new Promise<void>((resolve) => {
        const runNotBefore = runtime.scheduler.now() + ms;
        runtime.scheduler.schedule(runNotBefore, resolve);
      }),
  };
}

export class Runtime {
  readonly host: Host;

  readonly logger: LoggerFactory;
  readonly scheduler: Scheduler;

  readonly module: RuntimeModule;
  readonly globals: object;

  constructor(host: Host) {
    this.host = host;
    this.logger = new LoggerFactory(host);
    this.scheduler = new Scheduler();

    this.module = {};
    this.globals = makeGlobals(this);
  }
}

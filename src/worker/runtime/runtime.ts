import { RuntimeModule } from "../../shared/runtime";
import { Host } from "./host";
import { LoggerFactory } from "./logger";

function makeGlobals(runtime: Runtime): object {
  const console = runtime.logger.make("console");

  return {
    console: {
      debug: console.debug,
      log: console.info,
      warn: console.warn,
      error: console.error,
    },
  };
}

export class Runtime {
  readonly host: Host;

  readonly logger: LoggerFactory;

  readonly module: RuntimeModule;
  readonly globals: object;

  constructor(host: Host) {
    this.host = host;
    this.logger = new LoggerFactory(host);

    this.module = {};
    this.globals = makeGlobals(this);
  }
}

import * as Comlink from "comlink";
import { WorkerAPI } from "../../shared/comm";
import { execute } from "./executor/executor";
import { Runtime } from "./runtime/runtime";
import { Host, LogLevel } from "./runtime/host";

class WorkerHost implements Host {
  writeLog(level: LogLevel, tag: string, entry: unknown[]): void {
    switch (level) {
      case "debug":
        console.debug(`[${tag}]`, ...entry);
        break;
      case "info":
        console.log(`[${tag}]`, ...entry);
        break;
      case "warn":
        console.warn(`[${tag}]`, ...entry);
        break;
      case "error":
        console.error(`[${tag}]`, ...entry);
        break;
    }
  }
}

class Worker implements WorkerAPI {
  async run(bundleJS: string): Promise<void> {
    const runtime = new Runtime(new WorkerHost());
    await execute(bundleJS, runtime);
  }
}

Comlink.expose(new Worker());

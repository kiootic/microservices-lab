import * as Comlink from "comlink";
import { WorkerAPI } from "../shared/comm";
import { execute } from "./executor/executor";
import { Runtime } from "./runtime/runtime";

class Worker implements WorkerAPI {
  async run(bundleJS: string): Promise<unknown> {
    const runtime = new Runtime();
    return await execute(bundleJS, runtime);
  }
}

Comlink.expose(new Worker());

import * as Comlink from "comlink";
import { SandboxAPI, WorkerAPI } from "../shared/comm";
import { makeBundle } from "./bundler";
import WorkerScriptURL from "../worker?worker&url";

const trampolineScript = `import ${JSON.stringify(
  new URL(WorkerScriptURL, import.meta.url),
)};`;

class Sandbox implements SandboxAPI {
  async setup(): Promise<void> {}

  async run(modules: Map<string, string>): Promise<unknown> {
    const worker = new Worker(
      "data:application/javascript;base64," + btoa(trampolineScript),
      { type: "module" },
    );
    const workerAPI = Comlink.wrap<WorkerAPI>(worker);

    try {
      const bundleJS = await makeBundle(modules);
      const result = await workerAPI.run(bundleJS);
      return result;
    } finally {
      worker.terminate();
      workerAPI[Comlink.releaseProxy]();
    }
  }
}

Comlink.expose(new Sandbox(), Comlink.windowEndpoint(self.parent));

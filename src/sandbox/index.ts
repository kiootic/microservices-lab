import * as Comlink from "comlink";
import { SandboxAPI } from "../shared/comm";
import { Session } from "./session";
import WorkerScriptURL from "./worker/worker?worker&url";

const trampolineScript = URL.createObjectURL(
  new Blob(
    [
      `
import(${JSON.stringify(new URL(WorkerScriptURL, import.meta.url))})
  .finally(() => postMessage(null));
`,
    ],
    { type: "application/javascript" },
  ),
);

class Sandbox implements SandboxAPI {
  ping(): void {}

  async run(modules: Map<string, string>) {
    const worker = new Worker(trampolineScript);
    await new Promise<void>((resolve) => {
      worker.addEventListener("message", () => resolve(), { once: true });
    });

    const session = new Session(worker, modules);
    return Comlink.proxy(session);
  }
}

Comlink.expose(new Sandbox(), Comlink.windowEndpoint(self.parent));

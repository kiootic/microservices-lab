import * as Comlink from "comlink";
import { SandboxAPI, SessionAPI, WorkerAPI } from "../shared/comm";
import WorkerScriptURL from "./worker/worker?worker&url";
import { makeBundle } from "./bundler";

class Sandbox implements SandboxAPI {
  ping(): void {}

  async run(modules: Map<string, string>) {
    const session = new Session(modules);
    await session.init$;
    return Comlink.proxy(session);
  }
}

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

class Session implements SessionAPI {
  readonly cancel: () => void;
  private readonly cancel$: Promise<void>;

  private readonly worker: Worker;
  private readonly api: Comlink.Remote<WorkerAPI>;
  private disposed = false;

  readonly init$: Promise<void>;
  readonly done$: Promise<void>;

  constructor(modules: Map<string, string>) {
    let cancel!: () => void;
    this.cancel$ = new Promise<void>((resolve) => {
      cancel = resolve;
    });
    this.cancel = cancel;

    this.worker = new Worker(trampolineScript);
    this.api = Comlink.wrap<WorkerAPI>(this.worker);

    this.init$ = new Promise<void>((resolve) => {
      this.worker.addEventListener("message", () => resolve(), { once: true });
    });
    this.done$ = this.init$.then(() => this.run(modules));
  }

  async run(modules: Map<string, string>): Promise<void> {
    try {
      const bundleJS = await makeBundle(modules, this.cancel$);
      await Promise.race([this.api.run(bundleJS), this.cancel$]);
    } finally {
      this.dispose();
    }
  }

  ping(): void {}

  done() {
    return this.done$;
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.worker.terminate();
    this.api[Comlink.releaseProxy]();
    this.disposed = true;
  }
}

Comlink.expose(new Sandbox(), Comlink.windowEndpoint(self.parent));

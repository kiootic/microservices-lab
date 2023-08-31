import * as Comlink from "comlink";
import { SandboxAPI } from "../shared/comm";

export class Sandbox {
  private frame: HTMLIFrameElement;
  private api: Comlink.Remote<SandboxAPI>;

  private constructor(frame: HTMLIFrameElement) {
    this.frame = frame;
    this.api = Comlink.wrap(Comlink.windowEndpoint(frame.contentWindow!));
  }

  static async create(): Promise<Sandbox> {
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.sandbox.add("allow-scripts");
    frame.src = "sandbox.html";
    document.body.append(frame);

    try {
      await new Promise<void>((resolve, reject) => {
        frame.addEventListener("load", () => resolve());
        frame.addEventListener("error", (e) => reject(e.error));
      });

      const sandbox = new Sandbox(frame);
      await sandbox.api.setup();

      return sandbox;
    } catch (err) {
      frame.remove();
      throw err;
    }
  }

  dispose() {
    this.api[Comlink.releaseProxy]();
    this.frame.remove();
  }

  async run(modules: Map<string, string>) {
    return this.api.run(modules);
  }
}

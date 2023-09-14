import * as Comlink from "comlink";
import { SandboxAPI } from "../../shared/comm";

export class Sandbox {
  private readonly frame: HTMLIFrameElement;
  readonly api: Comlink.Remote<SandboxAPI>;
  private disposed = false;

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
      await new Promise<void>((resolve) => {
        frame.addEventListener("load", () => resolve());
      });

      const sandbox = new Sandbox(frame);

      return sandbox;
    } catch (err) {
      frame.remove();
      throw err;
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.api[Comlink.releaseProxy]();
    this.frame.remove();
    this.disposed = true;
  }
}

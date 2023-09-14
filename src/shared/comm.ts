import type { ProxyMarked } from "comlink";

export interface SandboxAPI {
  ping(): void;
  run(modules: ReadonlyMap<string, string>): SessionAPI & ProxyMarked;
}

export interface SessionAPI {
  ping(): void;
  done(): Promise<void>;
  cancel(): void;
  dispose(): void;
}

export interface WorkerAPI {
  run(bundleJS: string): Promise<void>;
}

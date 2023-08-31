export interface SandboxAPI {
  setup(): Promise<void>;
  run(modules: Map<string, string>): Promise<unknown>;
}

export interface WorkerAPI {
  run(bundleJS: string): Promise<unknown>;
}

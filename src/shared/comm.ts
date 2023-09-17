import type { ProxyMarked } from "comlink";

export interface SandboxAPI {
  ping(): void;
  run(modules: ReadonlyMap<string, string>): Promise<SessionAPI & ProxyMarked>;
}

export interface SessionPollResult {
  isCompleted: boolean;
  logCount: number;
}

export interface SessionAPI {
  ping(): void;
  poll(): SessionPollResult;
  cancel(): void;
  dispose(): void;
}

export interface WorkerAPI {
  run(host: WorkerHostAPI, bundleJS: string): Promise<void>;
}

export interface LogEntry {
  sequence: number;
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  name: string;
  message: string;
  context?: Record<string, string>;
}

export interface WorkerHostAPI {
  postLogs(logs: LogEntry[]): void;
}

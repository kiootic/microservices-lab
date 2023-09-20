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
  queryLogs(query: LogQuery): LogQueryPage;
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

export type LogQueryCursor =
  | { from: "before"; before: number }
  | { from: "after"; after: number };

export interface LogQueryCriteria {
  search?: string;
  showDebugLogs?: boolean;
}

export type LogQuery = {
  cursor: LogQueryCursor;
  limit: number;
  criteria: LogQueryCriteria;
};

export interface LogQueryPage {
  previous: LogQueryCursor | null;
  next: LogQueryCursor | null;
  logs: LogEntry[];
}

export interface WorkerHostAPI {
  postLogs(logs: LogEntry[]): void;
}

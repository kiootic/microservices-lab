import type { ProxyMarked } from "comlink";

export interface SandboxAPI {
  ping(): void;
  run(modules: ReadonlyMap<string, string>): Promise<SessionAPI & ProxyMarked>;
}

export interface SessionPollResult {
  isCompleted: boolean;
  logCount: number;
  metricNames: string[];
}

export interface SessionAPI {
  ping(): void;
  poll(): SessionPollResult;
  queryLogs(query: LogQuery): LogQueryPage;
  cancel(): void;
  dispose(): void;
}

export interface WorkerAPI {
  prepare(bundleJS: string): string;
  run(host: WorkerHostAPI, scriptURL: string): Promise<void>;
}

export interface LogEntry {
  sequence: number;
  timestamp?: number;
  level: "debug" | "info" | "warn" | "error";
  name: string;
  message: string;
  context: Record<string, string>;
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

export type MetricsTimeSeriesType = "counter" | "gauge" | "histogram";

export interface MetricsTimeSeriesMeta {
  name: string;
  labels: Partial<Record<string, string>>;
  type: MetricsTimeSeriesType;
}

export interface MetricsPartitionState {
  sequence: number;
  size: number;
  samples: Float32Array;
  series: Map<number, MetricsTimeSeriesMeta>;
}

export type WorkerLogContextValue =
  | string
  | {
      $error: string;
      stack: string;
    };

export interface WorkerLogEntry {
  timestamp?: number;
  level: "debug" | "info" | "warn" | "error";
  name: string;
  message: string;
  context?: Record<string, WorkerLogContextValue>;
}

export interface WorkerHostAPI {
  postLogs(logs: WorkerLogEntry[]): void;
  postMetrics(partition: MetricsPartitionState): void;
}

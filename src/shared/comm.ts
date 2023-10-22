import type { ProxyMarked } from "comlink";

export interface SandboxAPI {
  ping(): void;
  run(modules: ReadonlyMap<string, string>): Promise<SessionAPI & ProxyMarked>;
}

export interface SessionPollResult {
  isCompleted: boolean;
  logCount: number;
  metricNames: string[];
  metricSampleCount: number;
}

export interface SessionAPI {
  ping(): void;
  poll(): SessionPollResult;
  getMetrics(name: string, max?: number): MetricsTimeSeries[];
  queryMetrics(ids: number[]): MetricsTimeSeriesSamples[];
  queryLogs(query: LogQuery): LogQueryPage;
  cancel(): void;
  dispose(): void;
}

export interface WorkerAPI {
  prepare(bundleJS: string): string;
  run(host: WorkerHostAPI, scriptURL: string): Promise<void>;
}

export type MetricsTimeSeriesType = "counter" | "gauge" | "histogram";

export interface MetricsTimeSeries {
  id: number;
  name: string;
  labels: Partial<Record<string, string>>;
  type: MetricsTimeSeriesType;

  numSamples: number;
  min: number;
  max: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

export interface MetricsTimeSeriesSamples {
  timestamps: Float32Array;
  values: Float32Array;
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

export interface WorkerMetricsTimeSeriesMeta {
  name: string;
  labels: Partial<Record<string, string>>;
  type: MetricsTimeSeriesType;
}

export interface WorkerMetricsPartitionState {
  sequence: number;
  size: number;
  samples: Float32Array;
  series: Map<number, WorkerMetricsTimeSeriesMeta>;
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
  postMetrics(partition: WorkerMetricsPartitionState): void;
}

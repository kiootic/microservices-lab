export type LogLevel = "debug" | "info" | "warn" | "error";

export interface HostLogEntry {
  timestamp: number;
  level: LogLevel;
  name: string;
  message: string;
  context?: Record<string, string>;
}

export interface Host {
  writeLog(entry: HostLogEntry): void;
}

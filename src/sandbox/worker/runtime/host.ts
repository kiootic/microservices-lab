export type LogLevel = "debug" | "info" | "warn" | "error";

type LogContextValue =
  | string
  | {
      $error: string;
      stack: string;
    };

export interface HostLogEntry {
  timestamp: number;
  level: LogLevel;
  name: string;
  message: string;
  context?: Record<string, LogContextValue>;
}

export interface Host {
  writeLog(entry: HostLogEntry): void;
}

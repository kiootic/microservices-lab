export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Host {
  writeLog(level: LogLevel, tag: string, entry: unknown[]): void;
}

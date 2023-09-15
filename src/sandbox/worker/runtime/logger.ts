import { Host, LogLevel } from "./host";

function format(x: unknown) {
  const seen = new Set<unknown>();
  function doFormat(x: unknown): unknown {
    switch (typeof x) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return x;

      case "symbol":
        return `Symbol(${x.description ?? ""})`;

      case "function":
        return `[Function: ${x.name || "<anonymous>"}]`;

      case "object":
        if (x == null) {
          return x;
        } else if (seen.has(x)) {
          return "[Circular]";
        }
        seen.add(x);

        if (x instanceof Date) {
          return x.toISOString();
        } else if (x instanceof RegExp) {
          return String(x);
        } else if (x instanceof Error) {
          return x.stack;
        }

        if (Array.isArray(x)) {
          return x.map(doFormat);
        } else {
          return Object.fromEntries(
            Object.entries(x).map(([key, value]) => [key, doFormat(value)]),
          );
        }
    }
  }

  return doFormat(x);
}

export class LoggerFactory {
  private readonly host: Host;

  constructor(host: Host) {
    this.host = host;
  }

  make(tag: string): Logger {
    return {
      debug: this.writeLog.bind(this, tag, "debug"),
      info: this.writeLog.bind(this, tag, "info"),
      warn: this.writeLog.bind(this, tag, "warn"),
      error: this.writeLog.bind(this, tag, "error"),
    };
  }

  private writeLog(tag: string, level: LogLevel, ...args: unknown[]) {
    this.host.writeLog(
      level,
      tag,
      args.map((x) => format(x)),
    );
  }
}

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

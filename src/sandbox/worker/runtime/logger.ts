import { Host, LogLevel } from "./host";
import { Scheduler } from "./scheduler";
import { objDisplay, format } from "@vitest/utils";

export class LoggerFactory {
  private readonly host: Host;
  private readonly scheduler: Scheduler;

  constructor(host: Host, scheduler: Scheduler) {
    this.host = host;
    this.scheduler = scheduler;
  }

  make(name: string): Logger {
    return {
      debug: this.writeLog.bind(this, name, "debug"),
      info: this.writeLog.bind(this, name, "info"),
      warn: this.writeLog.bind(this, name, "warn"),
      error: this.writeLog.bind(this, name, "error"),
    };
  }

  private writeLog(
    name: string,
    level: LogLevel,
    message: string,
    context: Record<string, unknown> | undefined,
  ) {
    this.host.writeLog({
      timestamp: this.scheduler.currentTime,
      level,
      name,
      message,
      context: context
        ? Object.fromEntries(
            Object.entries(context).map(([key, value]) => [
              key,
              objDisplay(value),
            ]),
          )
        : undefined,
    });
  }
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

export function formatConsoleLog(
  logFn: (message: string, context?: Record<string, unknown>) => void,
  args: unknown[],
) {
  const message = format(...args);
  let context: Record<string, unknown> | undefined;
  for (const arg of args) {
    if (arg instanceof Error) {
      context = { ...context, stack: arg.stack };
    }
  }
  logFn(message, context);
}

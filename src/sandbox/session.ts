import { Remote, proxy, releaseProxy, wrap } from "comlink";
import {
  SessionAPI,
  WorkerAPI,
  WorkerHostAPI,
  LogEntry,
  SessionPollResult,
  LogQuery,
  LogQueryPage,
} from "../shared/comm";
import { BuildError, makeBundle } from "./bundler";
import { LogStore } from "./logs";

class WorkerHost implements WorkerHostAPI {
  private readonly session: Session;
  constructor(session: Session) {
    this.session = session;
  }

  postLogs(logs: LogEntry[]): void {
    this.session.logs.addBatch(logs);
  }
}

export class Session implements SessionAPI {
  readonly cancel: () => void;
  private readonly cancel$: Promise<void>;

  private readonly worker: Worker;
  private readonly api: Remote<WorkerAPI>;
  private disposed = false;

  isCompleted = false;
  readonly logs = new LogStore();

  constructor(worker: Worker, modules: Map<string, string>) {
    let cancel!: () => void;
    this.cancel$ = new Promise<void>((resolve) => {
      cancel = resolve;
    });
    this.cancel = cancel;

    this.worker = worker;
    this.api = wrap<WorkerAPI>(this.worker);

    void this.run(modules);
  }

  private log(
    level: LogEntry["level"],
    message: string,
    context?: Record<string, string>,
  ) {
    this.logs.add({ name: "main", level, message, context });
  }

  async run(modules: Map<string, string>): Promise<void> {
    try {
      this.log("debug", "Building modules...");
      let bundleJS: string;
      try {
        bundleJS = await makeBundle(modules, this.cancel$);
      } catch (err) {
        this.log("error", "Build failed.");
        if (err instanceof BuildError) {
          for (const msg of err.errors) {
            const context: Record<string, string> = {};
            if (msg.location != null) {
              const { file, line, column } = msg.location;
              context.location = [file, line, column].join(":");
            }
            this.log("error", "ERROR: " + msg.text, context);
          }
          return;
        }
        throw err;
      }

      this.log("debug", "Starting session...");

      let isCancelled = false;
      await Promise.race([
        this.api.run(proxy<WorkerHostAPI>(new WorkerHost(this)), bundleJS),
        this.cancel$.then(() => {
          isCancelled = true;
        }),
      ]);

      if (isCancelled) {
        this.log("error", "Cancelled.");
      }
    } catch (err) {
      const context: Record<string, string> = {};
      if (err instanceof Error && err.stack != null) {
        const desc = String(err);
        context.error = err.stack.startsWith(desc)
          ? err.stack
          : [desc, err.stack].join("\n");
      } else {
        context.error = String(err);
      }
      this.log("error", "Unexpected error occured.", context);
    } finally {
      this.isCompleted = true;
      this.dispose();
    }
  }

  ping(): void {}

  poll(): SessionPollResult {
    return {
      isCompleted: this.isCompleted,
      logCount: this.logs.count,
    };
  }

  queryLogs(query: LogQuery): LogQueryPage {
    return this.logs.query(query);
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.cancel();
    this.worker.terminate();
    this.api[releaseProxy]();
    this.disposed = true;
  }
}

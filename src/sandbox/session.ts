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
import { makeBundle } from "./bundler";
import { LogStore } from "./logs";

class WorkerHost implements WorkerHostAPI {
  private readonly session: Session;
  constructor(session: Session) {
    this.session = session;
  }

  postLogs(logs: LogEntry[]): void {
    this.session.logs.add(logs);
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

  async run(modules: Map<string, string>): Promise<void> {
    try {
      const bundleJS = await makeBundle(modules, this.cancel$);
      await Promise.race([
        this.api.run(proxy<WorkerHostAPI>(new WorkerHost(this)), bundleJS),
        this.cancel$,
      ]);
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

import { Remote, proxy, releaseProxy, wrap } from "comlink";
import {
  SessionAPI,
  WorkerAPI,
  WorkerHostAPI,
  LogEntry,
  SessionPollResult,
} from "../shared/comm";
import { makeBundle } from "./bundler";

class WorkerHost implements WorkerHostAPI {
  private readonly session: Session;
  constructor(session: Session) {
    this.session = session;
  }

  postLogs(logs: LogEntry[]): void {
    this.session.logCount += logs.length;
    this.session.logSegments.push(logs);
  }
}

export class Session implements SessionAPI {
  readonly cancel: () => void;
  private readonly cancel$: Promise<void>;

  private readonly worker: Worker;
  private readonly api: Remote<WorkerAPI>;
  private disposed = false;

  isCompleted = false;
  logCount = 0;
  readonly logSegments: LogEntry[][] = [];

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
      logCount: this.logCount,
    };
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

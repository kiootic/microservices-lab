import * as Comlink from "comlink";
import { WorkerAPI, WorkerHostAPI, LogEntry } from "../../shared/comm";
import { execute } from "./executor/executor";
import { Host, HostLogEntry } from "./runtime/host";
import { Runtime } from "./runtime/runtime";

const logBufferSize = 10000;
const logFlushInterval = 50;

class WorkerHost implements Host {
  private readonly host: Comlink.Remote<WorkerHostAPI>;
  private lastFlush: number;
  private readonly logBuffer: LogEntry[] = [];

  constructor(host: Comlink.Remote<WorkerHostAPI>) {
    this.host = host;
    this.lastFlush = Date.now();
  }

  writeLog(entry: HostLogEntry): void {
    this.logBuffer.push({ sequence: -1, ...entry });
    if (
      this.logBuffer.length >= logBufferSize ||
      Date.now() - this.lastFlush > logFlushInterval
    ) {
      this.flushLogs();
    }
  }

  dispose() {
    this.flushLogs();
  }

  private flushLogs() {
    void this.host.postLogs(this.logBuffer.slice());
    this.logBuffer.length = 0;
    this.lastFlush = Date.now();
  }
}

class Worker implements WorkerAPI {
  async run(
    host: Comlink.Remote<WorkerHostAPI>,
    bundleJS: string,
  ): Promise<void> {
    const workerHost = new WorkerHost(host);
    try {
      const runtime = new Runtime(workerHost);
      await execute(bundleJS, runtime);
    } finally {
      workerHost.dispose();
    }
  }
}

Comlink.expose(new Worker());

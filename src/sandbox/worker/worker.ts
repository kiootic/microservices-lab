import * as Comlink from "comlink";
import {
  MetricsPartitionState,
  WorkerAPI,
  WorkerHostAPI,
  WorkerLogEntry,
} from "../../shared/comm";
import { execute } from "./executor/executor";
import { Host, HostLogEntry } from "./runtime/host";
import { Runtime } from "./runtime/runtime";

const logBufferSize = 10000;
const logFlushInterval = 50;

class WorkerHost implements Host {
  private readonly host: Comlink.Remote<WorkerHostAPI>;
  private flushTimer: number;
  private readonly logBuffer: WorkerLogEntry[] = [];

  constructor(host: Comlink.Remote<WorkerHostAPI>) {
    this.host = host;
    this.flushTimer = setInterval(() => this.flushLogs(), logFlushInterval);
  }

  writeLog(entry: HostLogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length >= logBufferSize) {
      void this.flushLogs();
    }
  }

  writePartition(state: MetricsPartitionState): void {
    void this.host.postMetrics(state);
  }

  async dispose() {
    await this.flushLogs();
    clearInterval(this.flushTimer);
  }

  private async flushLogs() {
    const logs = this.logBuffer.slice();
    this.logBuffer.length = 0;
    await this.host.postLogs(logs);
  }
}

class Worker implements WorkerAPI {
  prepare(bundleJS: string) {
    return URL.createObjectURL(
      new Blob([bundleJS], { type: "application/javascript" }),
    );
  }

  async run(
    host: Comlink.Remote<WorkerHostAPI>,
    scriptURL: string,
  ): Promise<void> {
    const workerHost = new WorkerHost(host);
    let runtime: Runtime | undefined;
    try {
      runtime = new Runtime(workerHost);
      await execute(scriptURL, runtime);
    } finally {
      runtime?.dispose();
      await workerHost.dispose();
    }
  }
}

Comlink.expose(new Worker());

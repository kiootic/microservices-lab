import { ProxyMarked, Remote, releaseProxy } from "comlink";
import { createStore } from "zustand";
import {
  LogQuery,
  LogQueryPage,
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
  SessionAPI,
} from "../../shared/comm";
import { setAsyncInternal } from "../utils/async-interval";
import { Sandbox } from "./sandbox";
import { shallow } from "zustand/shallow";

async function withTimeout<T>(x: Promise<T>): Promise<T> {
  const token = Symbol();
  const timeout = new Promise<typeof token>((resolve) => {
    setTimeout(() => resolve(token), 1000);
  });
  const result = await Promise.race([x, timeout]);
  if (result === token) {
    throw new Error("Sandbox timed out");
  }
  return result;
}

let sandbox$: Promise<Sandbox> | null = null;
async function ensureSandbox() {
  if (sandbox$ == null) {
    sandbox$ = Sandbox.create().catch((reason) => {
      sandbox$ = null;
      return Promise.reject(reason);
    });
  }

  const sandbox = await sandbox$;
  try {
    await withTimeout(sandbox.api.ping());
  } catch (err) {
    sandbox.dispose();
    sandbox$ = null;
    throw err;
  }
  return sandbox;
}

void ensureSandbox();

export interface SessionState {
  id: number;
  status: "idle" | "preparing" | "running" | "disconnected";
  logCount: number;
  metricOwnerKeys: string[];
  metricSampleCount: number;
}

class Session {
  private readonly owner: SessionController;
  private readonly sandbox: Sandbox;
  private readonly session: Remote<SessionAPI & ProxyMarked>;

  private disposePoll: (() => void) | null = null;
  private disposed = false;

  constructor(
    owner: SessionController,
    sandbox: Sandbox,
    session: Remote<SessionAPI & ProxyMarked>,
  ) {
    this.owner = owner;
    this.sandbox = sandbox;
    this.session = session;
  }

  init() {
    this.setState({ status: "running" });
    this.disposePoll = setAsyncInternal(() => this.poll(), 50);
  }

  private setState(state: SessionState | Partial<SessionState>) {
    if (this.owner.session === this) {
      this.owner.state.setState(state);
    }
  }

  private async checkAlive() {
    if (this.disposed) {
      return false;
    }
    try {
      await withTimeout(this.session.ping());
      return true;
    } catch (err) {
      this.sandbox.dispose();
      sandbox$ = null;

      this.cleanup(true);
      throw err;
    }
  }

  private async poll() {
    if (!(await this.checkAlive())) {
      return;
    }
    const result = await this.session.poll();
    if (this.disposed) {
      return;
    }

    const oldOwnerKeys = this.owner.state.getState().metricOwnerKeys;
    this.setState({
      status: result.isCompleted ? "idle" : "running",
      logCount: result.logCount,
      metricOwnerKeys: shallow(oldOwnerKeys, result.metricOwnerKeys)
        ? oldOwnerKeys
        : result.metricOwnerKeys,
      metricSampleCount: result.metricSampleCount,
    });
    if (result.isCompleted) {
      this.disposePoll?.();
      this.disposePoll = null;
    }
  }

  async getMetricNames(ownerKey: string): Promise<string[]> {
    if (!(await this.checkAlive())) {
      return [];
    }
    return await this.session.getMetricNames(ownerKey);
  }

  async getMetrics(
    ownerKey: string,
    name: string,
    max?: number,
    labels?: Partial<Record<string, string>>,
  ): Promise<MetricsTimeSeries[]> {
    if (!(await this.checkAlive())) {
      return [];
    }
    return await this.session.getMetrics(ownerKey, name, max, labels);
  }

  async queryMetrics(
    ownerKey: string,
    ids: number[],
  ): Promise<MetricsTimeSeriesSamples[]> {
    if (!(await this.checkAlive())) {
      return [];
    }
    return await this.session.queryMetrics(ownerKey, ids);
  }

  async queryLogs(query: LogQuery): Promise<LogQueryPage> {
    if (!(await this.checkAlive())) {
      return { previous: null, next: null, logs: [] };
    }
    return await this.session.queryLogs(query);
  }

  async cancel() {
    if (!(await this.checkAlive())) {
      return;
    }
    await this.session.cancel();
  }

  async dispose() {
    if (!(await this.checkAlive())) {
      return;
    }
    await this.session.dispose();
    this.cleanup(false);
  }

  private cleanup(abnormal: boolean) {
    if (this.disposed) {
      return;
    }

    this.session[releaseProxy]();

    this.disposePoll?.();
    this.disposePoll = null;

    this.setState({ status: abnormal ? "disconnected" : "idle" });
    if (this.owner.session === this) {
      this.owner.session = null;
    }

    this.disposed = true;
  }
}

export class SessionController {
  session: Session | null = null;
  private session$: Promise<Session> | null = null;

  readonly state = createStore<SessionState>(() => ({
    id: 1,
    status: "idle",
    logCount: 0,
    metricOwnerKeys: [],
    metricSampleCount: 0,
  }));

  private async startSession(modules: ReadonlyMap<string, string>) {
    try {
      const sandbox = await ensureSandbox();
      const session = await sandbox.api.run(modules);
      this.session = new Session(this, sandbox, session);
      this.session.init();
      return this.session;
    } catch (e) {
      this.session = null;
      throw e;
    }
  }

  async start(modules: ReadonlyMap<string, string>) {
    if (this.session$ != null) {
      const session = await this.session$;
      await session.dispose();
    }

    this.state.setState((s) => ({
      id: s.id + 1,
      status: "preparing",
      logCount: 0,
      metricOwnerKeys: [],
      metricSampleCount: 0,
    }));
    this.session$ = this.startSession(modules);
  }

  async getMetricNames(ownerKey: string): Promise<string[]> {
    const session = await this.session$;
    if (session == null) {
      return [];
    }

    return session.getMetricNames(ownerKey);
  }

  async getMetrics(
    ownerKey: string,
    name: string,
    max?: number,
    labels?: Partial<Record<string, string>>,
  ): Promise<MetricsTimeSeries[]> {
    const session = await this.session$;
    if (session == null) {
      return [];
    }

    return session.getMetrics(ownerKey, name, max, labels);
  }

  async queryMetrics(
    ownerKey: string,
    ids: number[],
  ): Promise<MetricsTimeSeriesSamples[]> {
    const session = await this.session$;
    if (session == null) {
      return [];
    }

    return session.queryMetrics(ownerKey, ids);
  }

  async queryLogs(query: LogQuery): Promise<LogQueryPage> {
    const session = await this.session$;
    if (session == null) {
      return { previous: null, next: null, logs: [] };
    }

    return session.queryLogs(query);
  }

  async cancel() {
    const session = await this.session$;
    if (session == null) {
      return;
    }

    await session.cancel();
  }

  async dispose() {
    const session = await this.session$;
    if (session == null) {
      return;
    }

    await session.dispose();
  }
}

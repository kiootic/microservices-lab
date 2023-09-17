import { ProxyMarked, Remote, releaseProxy } from "comlink";
import { SessionAPI } from "../../shared/comm";
import { Sandbox } from "./sandbox";
import { createStore } from "zustand";
import { setAsyncInternal } from "../utils/async-interval";

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

ensureSandbox();

export interface SessionState {
  status: "idle" | "preparing" | "running" | "disconnected";
  logCount: number;
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
    this.setState({ status: "running", logCount: 0 });
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

    this.setState({
      status: result.isCompleted ? "idle" : "running",
      logCount: result.logCount,
    });
    if (result.isCompleted) {
      this.disposePoll?.();
      this.disposePoll = null;
    }
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
    status: "idle",
    logCount: 0,
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

    this.state.setState({ status: "preparing" });
    this.session$ = this.startSession(modules);
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

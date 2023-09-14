import { ProxyMarked, Remote, releaseProxy } from "comlink";
import { SessionAPI } from "../../shared/comm";
import { Sandbox } from "./sandbox";
import { StoreApi, createStore } from "zustand";

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

interface SessionHandle {
  sandbox: Sandbox;
  session: Remote<SessionAPI & ProxyMarked>;
}

export interface SessionState {
  status: "idle" | "running";
}

export class Session {
  private handle$: Promise<SessionHandle> | null = null;
  private done$: Promise<void> | null = null;
  private done: (() => void) | null = null;

  readonly state: StoreApi<SessionState> = createStore(() => ({
    status: "idle",
  }));

  async start(modules: ReadonlyMap<string, string>) {
    await this.cancel();
    await this.dispose();

    this.handle$ = ensureSandbox().then(async (sandbox) => ({
      sandbox,
      session: await sandbox.api.run(modules),
    }));
    this.state.setState({ status: "running" });

    this.done$ = new Promise<void>((resolve) => {
      this.done = resolve;
    }).finally(() => {
      this.handle$ = null;
      this.done$ = null;
      this.done = null;
      this.state.setState({ status: "idle" });
    });

    this.handle$
      .then(({ session }) => session.done())
      .finally(() => this.done?.());
  }

  private async cleanup(session: Remote<SessionAPI & ProxyMarked>) {
    session[releaseProxy]();
    this.done?.();
    await this.done$;
  }

  private async session(): Promise<Remote<SessionAPI & ProxyMarked> | null> {
    if (this.handle$ == null) {
      return null;
    }

    const { sandbox, session } = await this.handle$;
    try {
      await withTimeout(session.ping());
      return session;
    } catch (err) {
      sandbox.dispose();
      sandbox$ = null;
      await this.cleanup(session);

      throw err;
    }
  }

  async cancel() {
    const session = await this.session();
    if (session == null) {
      return;
    }

    await session.cancel();
  }

  async dispose() {
    const session = await this.session();
    if (session == null) {
      return;
    }

    await session.dispose();
    await this.cleanup(session);
  }
}

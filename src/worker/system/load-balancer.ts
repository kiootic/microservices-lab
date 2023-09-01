import { random } from "../utils/random";
import { ServiceUnavailableError } from "./errors";
import type { Host } from "./host";
import type { SystemContext } from "./system";

export class LoadBalancer {
  private readonly ctx: SystemContext;
  readonly service: string;

  constructor(ctx: SystemContext, service: string) {
    this.ctx = ctx;
    this.service = service;
  }

  selectHost(): Host | null {
    const serviceHosts = this.ctx.hosts.get(this.service) ?? [];

    return random.choice(serviceHosts);
  }

  invoke(fnName: string, args: unknown[]): Promise<unknown> {
    const host = this.selectHost();
    if (host == null) {
      throw new ServiceUnavailableError(this.service);
    }
    return host.invoke(fnName, args);
  }
}

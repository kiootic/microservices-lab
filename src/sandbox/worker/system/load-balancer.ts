import { random } from "../utils/random";
import { ServiceUnavailableError } from "./errors";
import type { Node } from "./node";
import type { SystemContext } from "./system";

export class LoadBalancer {
  private readonly ctx: SystemContext;
  readonly service: string;

  constructor(ctx: SystemContext, service: string) {
    this.ctx = ctx;
    this.service = service;
  }

  selectNode(): Node | null {
    const serviceNodes = this.ctx.nodes.get(this.service) ?? [];

    return random.choice(serviceNodes);
  }

  invoke(fnName: string, args: unknown[]): Promise<unknown> {
    const node = this.selectNode();
    if (node == null) {
      throw new ServiceUnavailableError(this.service);
    }
    return node.invoke(fnName, args);
  }
}

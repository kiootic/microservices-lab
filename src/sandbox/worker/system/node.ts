import { Logger } from "../runtime/logger";
import { Semaphore } from "../utils/async";
import { ServiceModule } from "./service";
import { SystemContext } from "./system";

export class Node {
  readonly id: string;
  readonly service: string;
  readonly logger: Logger;
  private readonly sema: Semaphore;
  private readonly instance: Record<string, unknown>;

  get load(): number {
    return this.sema.active / this.sema.max;
  }

  private get concurrency(): number {
    return Infinity;
  }

  constructor(
    ctx: SystemContext,
    id: string,
    service: string,
    module: ServiceModule,
  ) {
    this.id = id;
    this.service = service;
    this.logger = ctx.runtime.logger.make(id);
    this.sema = new Semaphore(this.concurrency);

    this.instance = module.instance({
      nodeID: id,
      logger: this.logger,
    });
  }

  invoke(fnName: string, args: unknown[]): Promise<unknown> {
    const fn = this.instance[fnName];
    if (typeof fn !== "function") {
      throw new TypeError(
        `Function ${fnName} does not exists in service ${this.service}`,
      );
    }

    return this.sema.run(1, async () => {
      return fn.apply(this.instance, args) as Promise<unknown>;
    });
  }
}

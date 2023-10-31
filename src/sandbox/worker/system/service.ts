import { Logger } from "../runtime/logger";

export interface ServiceContext {
  nodeID: string;
  logger: Logger;
}

export abstract class Service {
  static readonly __name: string;
  static get replicas() {
    return 1;
  }

  readonly nodeID: string;
  readonly logger: Logger;

  constructor(ctx: ServiceContext) {
    this.nodeID = ctx.nodeID;
    this.logger = ctx.logger;
  }
}

export interface ServiceConstructor<Name extends string = string> {
  readonly __name: Name;
  readonly replicas: number;

  new (ctx: ServiceContext): Service;
}

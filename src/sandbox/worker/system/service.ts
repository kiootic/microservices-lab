import { Logger } from "../runtime/logger";

export interface ServiceContext {
  nodeID: string;
  logger: Logger;
}

export abstract class Service {
  static readonly __name: string;

  readonly nodeID: string;
  readonly logger: Logger;

  constructor(ctx: ServiceContext) {
    this.nodeID = ctx.nodeID;
    this.logger = ctx.logger;
  }
}

export interface ServiceConstructor<Name extends string = string> {
  readonly __name: Name;

  new (ctx: ServiceContext): Service;
}

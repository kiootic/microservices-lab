import { Logger } from "../runtime/logger";

export interface ServiceContext {
  nodeID: string;
  logger: Logger;
}

export interface ServiceModule {
  instance: (ctx: ServiceContext) => Record<string, unknown>;
}

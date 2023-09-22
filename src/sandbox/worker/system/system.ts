import { Logger } from "../runtime/logger";
import { Runtime } from "../runtime/runtime";
import { LoadBalancer } from "./load-balancer";
import { VirtualNetwork } from "./network";
import { Node } from "./node";
import type { ServiceModule } from "./service";

export interface SystemContext {
  readonly runtime: Runtime;
  readonly modules: Map<string, ServiceModule>;

  nextNodeID: number;
  readonly nodes: Map<string, Node[]>;
  readonly services: Map<string, LoadBalancer>;
}

export class System {
  private readonly runtime: Runtime;
  readonly logger: Logger;
  private readonly serviceModules = new Map<string, Promise<ServiceModule>>();

  private readonly context: SystemContext;
  readonly network: VirtualNetwork;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
    this.logger = runtime.logger.make("system");

    this.context = {
      runtime: this.runtime,
      nextNodeID: 1,
      modules: new Map(),
      nodes: new Map(),
      services: new Map(),
    };
    this.network = new VirtualNetwork(this.context);
  }

  defineServices<T extends Record<string, Promise<ServiceModule>>>(
    services: T,
  ) {
    for (const [name, module$] of Object.entries(services)) {
      this.serviceModules.set(name, module$);
    }
    return services;
  }

  async setup() {
    for (const [service, module$] of this.serviceModules) {
      this.logger.debug("Setting up service...", { service });
      try {
        const module = await module$;
        this.context.modules.set(service, module);
      } catch (error) {
        this.logger.error("Service setup failed.", { error });
      }
    }

    this.reset();
  }

  private instantiateNode(service: string) {
    const module = this.context.modules.get(service);
    if (module == null) {
      throw new TypeError(`Service ${service} not found`);
    }

    const nodeID = [service, this.context.nextNodeID++].join("/");
    this.logger.debug("Instantiating node...", { nodeID });

    const nodes = this.context.nodes.get(service)?.slice() ?? [];
    nodes.push(new Node(this.context, nodeID, service, module));
    this.context.nodes.set(service, nodes);
  }

  reset() {
    this.context.nextNodeID = 1;
    this.context.nodes.clear();
    this.context.services.clear();

    for (const service of this.context.modules.keys()) {
      const lb = new LoadBalancer(this.context, service);
      this.context.services.set(service, lb);
      this.instantiateNode(service);
    }
  }
}

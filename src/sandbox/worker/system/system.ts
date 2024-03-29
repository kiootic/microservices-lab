import { Logger } from "../runtime/logger";
import { MetricsFactory } from "../runtime/metrics";
import { Runtime } from "../runtime/runtime";
import { SystemConfig } from "./config";
import { LoadBalancer } from "./load-balancer";
import { VirtualNetwork } from "./network";
import { Node } from "./node";
import type { ServiceConstructor } from "./service";

export interface SystemContext {
  readonly runtime: Runtime;
  readonly metrics: MetricsFactory;
  readonly services: Map<string, ServiceConstructor>;

  nextNodeID: number;
  readonly nodes: Map<string, Node[]>;
  readonly loadBalancers: Map<string, LoadBalancer>;
}

export class System {
  private readonly runtime: Runtime;
  readonly logger: Logger;

  private readonly context: SystemContext;
  readonly network: VirtualNetwork;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
    this.logger = runtime.logger.make("system");

    this.context = {
      runtime: this.runtime,
      metrics: this.runtime.metrics.factory,
      nextNodeID: 1,
      services: new Map(),
      nodes: new Map(),
      loadBalancers: new Map(),
    };
    this.network = new VirtualNetwork(this.context);

    runtime.config.define("system", SystemConfig.instance);
  }

  defineService<T extends ServiceConstructor>(service: T) {
    if (this.context.services.has(service.__name)) {
      throw new TypeError(`Duplicated service ${service.__name}`);
    }
    this.context.services.set(service.__name, service);
  }

  setup() {
    this.reset();
  }

  private instantiateNode(service: string) {
    const Service = this.context.services.get(service);
    if (Service == null) {
      throw new TypeError(`Service ${service} not found`);
    }

    const nodeID = [service, this.context.nextNodeID++].join("/");
    this.logger.debug("Instantiating node...", { nodeID });

    const nodes = this.context.nodes.get(service)?.slice() ?? [];
    nodes.push(new Node(this.context, nodeID, service, Service));
    this.context.nodes.set(service, nodes);
  }

  reset() {
    this.context.nextNodeID = 1;
    this.context.nodes.clear();
    this.context.loadBalancers.clear();

    for (const service of this.context.services.keys()) {
      const lb = new LoadBalancer(this.context, service);
      this.context.loadBalancers.set(service, lb);

      const Service = this.context.services.get(service);
      if (Service == null) {
        throw new TypeError(`Service ${service} not found`);
      }

      const replicas = Service.replicas;
      for (let i = 0; i < replicas; i++) {
        this.instantiateNode(service);
      }
    }
  }
}

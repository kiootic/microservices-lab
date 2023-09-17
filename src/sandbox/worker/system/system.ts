import { Host } from "./host";
import { LoadBalancer } from "./load-balancer";
import { VirtualNetwork } from "./network";
import { ServiceModule } from "./service";

export interface SystemContext {
  nextHostID: number;

  readonly modules: Map<string, ServiceModule>;
  readonly hosts: Map<string, Host[]>;
  readonly services: Map<string, LoadBalancer>;
}

export class System {
  private readonly serviceModules = new Map<string, Promise<ServiceModule>>();
  private hostType: typeof Host = Host;
  private lbType: typeof LoadBalancer = LoadBalancer;
  private vnetType: typeof VirtualNetwork = VirtualNetwork;

  private readonly context: SystemContext = {
    nextHostID: 1,
    modules: new Map(),
    hosts: new Map(),
    services: new Map(),
  };
  private vnet: VirtualNetwork | null = null;

  get network(): VirtualNetwork {
    if (this.vnet == null) {
      throw new TypeError("System is not setup");
    }
    return this.vnet;
  }

  setHostType(type: typeof Host) {
    this.hostType = type;
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
    const VirtualNetwork = this.vnetType;
    for (const [service, module$] of this.serviceModules) {
      const module = await module$;
      this.context.modules.set(service, module);
    }

    this.vnet = new VirtualNetwork(this.context);
    await this.reset();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async reset() {
    this.context.nextHostID = 1;
    this.context.hosts.clear();
    this.context.services.clear();

    const Host = this.hostType;
    const LoadBalancer = this.lbType;
    for (const [service, module] of this.context.modules) {
      const hostID = this.context.nextHostID++;
      const instance = module.instance(hostID);
      const hosts = [new Host(hostID, service, instance)];

      this.context.hosts.set(service, hosts);
      this.context.services.set(
        service,
        new LoadBalancer(this.context, service),
      );
    }
  }
}

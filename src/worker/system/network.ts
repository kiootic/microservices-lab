import { ServiceUnavailableError } from "./errors";
import type { SystemContext } from "./system";

type AnyFunction = (...args: unknown[]) => unknown;

export class VirtualNetwork {
  private readonly ctx: SystemContext;

  constructor(ctx: SystemContext) {
    this.ctx = ctx;
  }

  invoke(service: string, fn: string, args: unknown[]): Promise<unknown> {
    const lb = this.ctx.services.get(service);
    if (lb == null) {
      throw new ServiceUnavailableError(service);
    }
    return lb.invoke(fn, args);
  }

  static proxy(
    get: () => VirtualNetwork,
  ): Record<string, Record<string, AnyFunction>> {
    const cache = new Map<string, Record<string, AnyFunction>>();
    return new Proxy(
      {},
      {
        get: (_, service: string) => {
          let proxy = cache.get(service);
          if (proxy == null) {
            proxy = new Proxy(
              {},
              {
                get: (_, fn: string) => {
                  return (...args: unknown[]) =>
                    get().invoke(service, fn, args);
                },
              },
            );
            cache.set(service, proxy);
          }
          return proxy;
        },
      },
    );
  }
}

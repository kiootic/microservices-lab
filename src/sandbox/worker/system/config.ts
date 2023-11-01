import type { Runtime } from "../../../shared/runtime";

type Interceptor = (next: () => Promise<unknown>) => () => Promise<unknown>;

export class SystemConfig implements Runtime.SystemConfig {
  static readonly instance = new SystemConfig();

  readonly interceptors: Interceptor[] = [];
  readonly servicePerformanceFactors = new Map<string, number>();

  private constructor() {}

  onInvoke(intercepter: Interceptor) {
    this.interceptors.push(intercepter);
  }

  adjustServicePerformance(service: string, factor: number): void {
    let f = this.servicePerformanceFactors.get(service) ?? 1;
    f *= factor;
    this.servicePerformanceFactors.set(service, f);
  }
}

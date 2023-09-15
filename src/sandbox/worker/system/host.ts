import { Semaphore } from "../utils/async";

export class Host {
  readonly id: number;
  readonly service: string;
  private readonly instance: Record<string, unknown>;
  private readonly sema: Semaphore;

  get load(): number {
    return this.sema.active / this.sema.max;
  }

  private get concurrency(): number {
    return Infinity;
  }

  constructor(id: number, service: string, instance: Record<string, unknown>) {
    this.id = id;
    this.service = service;
    this.instance = instance;
    this.sema = new Semaphore(this.concurrency);
  }

  invoke(fnName: string, args: unknown[]): Promise<unknown> {
    const fn = this.instance[fnName];
    if (typeof fn !== "function") {
      throw new TypeError(
        `Function ${fnName} does not exists in service ${this.service}`,
      );
    }
    return this.sema.run(1, async () => fn.apply(this.instance, args));
  }
}

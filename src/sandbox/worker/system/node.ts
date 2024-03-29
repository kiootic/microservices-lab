import { Logger } from "../runtime/logger";
import { Zone } from "../runtime/zone";
import { random } from "../utils/random";
import { SystemConfig } from "./config";
import { Service, ServiceConstructor } from "./service";
import { SystemContext } from "./system";
import { Task, TaskZone } from "./task";

export class Node {
  private readonly ctx: SystemContext;
  readonly id: string;
  readonly service: string;
  readonly logger: Logger;
  private readonly instance: Service & Record<string | symbol, unknown>;

  private numTasks = 0;
  private readonly pendingTasks: TaskZone[] = [];
  private isScheduled = false;
  private scheduleTimeslice = 0;

  private readonly loadCounter = new LoadCounter();
  private readonly metrics;

  constructor(
    ctx: SystemContext,
    id: string,
    service: string,
    Service: ServiceConstructor,
  ) {
    this.ctx = ctx;
    this.id = id;
    this.service = service;
    this.logger = ctx.runtime.logger.make(id);

    this.instance = new Service({
      nodeID: id,
      logger: this.logger,
    }) as Service & Record<string | symbol, unknown>;

    this.metrics = {
      fn_duration_ms: ctx.metrics
        .histogram("system.fn_duration_ms", { service, node: id })
        .vec("fn"),
      fn_count: ctx.metrics
        .counter("system.fn_count", { service, node: id })
        .vec("fn"),
      node_load: ctx.metrics.gauge("system.node_load", { service, node: id }),
    };
  }

  get scheduler() {
    return this.ctx.runtime.scheduler;
  }

  get load(): number {
    return this.numTasks === 0
      ? 0
      : Math.min(1, this.pendingTasks.length / this.numTasks);
  }

  async invoke(fnName: string, args: unknown[]): Promise<unknown> {
    const fn = this.instance[fnName];
    if (typeof fn !== "function") {
      throw new TypeError(
        `Function ${fnName} does not exists in service ${this.service}`,
      );
    }

    const task = new TaskZone(
      this,
      this.service,
      fnName,
      Zone.current?.context.task,
    );

    const start = this.scheduler.currentTime;
    this.numTasks++;
    try {
      return await task.run(
        async () => (await fn.apply(this.instance, args)) as Promise<unknown>,
      );
    } finally {
      this.numTasks--;
      const end = this.scheduler.currentTime;
      this.metrics.fn_duration_ms.get(fnName).observe(end - start);
      this.metrics.fn_count.get(fnName).increment();
    }
  }

  scheduleTask(zone: TaskZone): void {
    this.schedulePendingTasks(zone.task);
    this.pendingTasks.push(zone);
  }

  private getTaskTimeslice(task: Task) {
    const timeslice = 1;
    const factor =
      SystemConfig.instance.servicePerformanceFactors.get(task.service) ?? 1;
    return timeslice / factor;
  }

  private schedulePendingTasks(task: Task) {
    if (this.isScheduled) {
      return;
    }

    this.isScheduled = true;
    const scheduler = this.scheduler;
    const delay = this.getTaskTimeslice(task) * random.exponential();
    this.scheduleTimeslice = delay;
    scheduler.schedule(scheduler.currentTime + delay, runPendingTasks, this);

    this.loadCounter.addTimeslice(scheduler.currentTime, delay);
  }

  runPendingTasks() {
    this.isScheduled = false;

    const load = this.loadCounter.collect(this.scheduler.currentTime);
    if (load != null) {
      this.metrics.node_load.set(load);
    }

    const zone = this.pendingTasks.shift();
    if (zone == null) {
      return;
    }
    zone.runTask(this.scheduleTimeslice);

    if (this.pendingTasks.length > 0) {
      this.schedulePendingTasks(this.pendingTasks[0].task);
    }
  }
}

function runPendingTasks(node: Node) {
  node.runPendingTasks();
}

const loadAccountPeriodMS = 100;

class LoadCounter {
  private periodBeginTimestamp = -1;
  private periodBusyDuration = 0;

  private resetPeriod(start: number) {
    this.periodBeginTimestamp = start;
    this.periodBusyDuration = 0;
  }

  addTimeslice(start: number, duration: number) {
    if (this.periodBeginTimestamp < 0) {
      this.resetPeriod(start);
    }

    this.periodBusyDuration += duration;
  }

  collect(timestamp: number): number | null {
    if (timestamp >= this.periodBeginTimestamp + loadAccountPeriodMS) {
      const periodDuration = timestamp - this.periodBeginTimestamp;
      const load = this.periodBusyDuration / periodDuration;
      this.resetPeriod(timestamp);
      return load;
    }
    return null;
  }
}

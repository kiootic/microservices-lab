import { Logger } from "../runtime/logger";
import { Zone } from "../runtime/zone";
import { random } from "../utils/random";
import { Service, ServiceConstructor } from "./service";
import { SystemContext } from "./system";
import { Task, TaskOwner, TaskZone } from "./task";

export class Node implements TaskOwner {
  private readonly ctx: SystemContext;
  readonly id: string;
  readonly service: string;
  readonly logger: Logger;
  private readonly instance: Service & Record<string | symbol, unknown>;

  private numTasks = 0;
  private readonly pendingTasks: TaskZone[] = [];
  private isScheduled = false;

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
      node_load: ctx.metrics.gauge("system.node_load", { node: id }),
    };
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
      this.id,
      fnName,
      Zone.current?.context.task,
    );

    const start = this.ctx.runtime.scheduler.currentTime;
    this.numTasks++;
    try {
      return await task.run(
        async () => (await fn.apply(this.instance, args)) as Promise<unknown>,
      );
    } finally {
      this.numTasks--;
      const end = this.ctx.runtime.scheduler.currentTime;
      this.metrics.fn_duration_ms.get(fnName).observe(end - start);
      this.metrics.fn_count.get(fnName).increment();
    }
  }

  scheduleTask(zone: TaskZone): void {
    this.schedulePendingTasks(zone.task);
    this.pendingTasks.push(zone);
  }

  private getTaskTimeslice(task: Task) {
    let timeslice = 1;
    for (const cond of this.ctx.conditioners) {
      timeslice *= cond.getTaskTimesliceFactor?.(task) ?? 1;
    }
    return timeslice;
  }

  private schedulePendingTasks(task: Task) {
    if (this.isScheduled) {
      return;
    }

    this.isScheduled = true;
    const scheduler = this.ctx.runtime.scheduler;
    const delay = this.getTaskTimeslice(task) * random.exponential();
    scheduler.schedule(scheduler.currentTime + delay, runPendingTasks, this);

    this.loadCounter.addTimeslice(scheduler.currentTime, delay);
  }

  runPendingTasks() {
    this.isScheduled = false;

    const load = this.loadCounter.collect(
      this.ctx.runtime.scheduler.currentTime,
    );
    if (load != null) {
      this.metrics.node_load.set(load);
    }

    const zone = this.pendingTasks.shift();
    if (zone == null) {
      return;
    }
    zone.flushMicrotasks();

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

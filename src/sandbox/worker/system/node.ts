import { Logger } from "../runtime/logger";
import { Zone } from "../runtime/zone";
import { random } from "../utils/random";
import { Service, ServiceConstructor } from "./service";
import { SystemContext } from "./system";
import { TaskOwner, TaskZone } from "./task";

export class Node implements TaskOwner {
  private readonly ctx: SystemContext;
  readonly id: string;
  readonly service: string;
  readonly logger: Logger;
  private readonly instance: Service & Record<string | symbol, unknown>;
  private readonly pendingTasks: TaskZone[] = [];
  private isScheduled = false;

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

    return task.run(() => fn.apply(this.instance, args) as Promise<unknown>);
  }

  scheduleTask(task: TaskZone): void {
    if (!this.isScheduled) {
      this.isScheduled = true;

      const scheduler = this.ctx.runtime.scheduler;
      scheduler.schedule(
        scheduler.currentTime + this.getTaskTimeslice(),
        runPendingTasks,
        this,
      );
    }
    this.pendingTasks.push(task);
  }

  private getTaskTimeslice() {
    // FIXME: config
    return random.erlang(3) * 2;
  }

  runPendingTasks() {
    this.isScheduled = false;

    const task = this.pendingTasks.pop();
    if (task != null) {
      task.flushMicrotasks();
    }

    if (this.pendingTasks.length > 0) {
      const scheduler = this.ctx.runtime.scheduler;
      scheduler.schedule(
        scheduler.currentTime + this.getTaskTimeslice(),
        runPendingTasks,
        this,
      );
    }
  }
}

function runPendingTasks(node: Node) {
  node.runPendingTasks();
}

import { MicrotaskQueue, Zone } from "../runtime/zone";
import type { Node } from "./node";

export interface Task {
  id: number;
  nodeID: string | null;
  fn: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Zone {
    interface Context {
      task: Task;
      caller: Task | undefined;
    }
  }
}

let nextTaskID = 1;

export class TaskZone extends Zone {
  readonly task: Task;
  private readonly node: Node | null;
  private readonly queue = new MicrotaskQueue(this);

  private spinUntil = -1;
  private isScheduled = false;

  constructor(node: Node | null, fn: string, caller?: Task) {
    const id = nextTaskID++;
    const nodeID = node?.id ?? null;
    const task: Task = { id, nodeID, fn };
    super(`task:${nodeID}:${fn}:${id}`, { task, caller });
    this.task = task;
    this.node = node;
  }

  private schedule() {
    if (this.isScheduled) {
      return;
    }

    this.isScheduled = true;
    if (this.node != null) {
      this.node.scheduleTask(this);
    } else {
      Zone.root.scheduleMicrotask(runTask, this);
    }
  }

  scheduleMicrotask<T>(fn: (x: T) => void, arg: T): void {
    this.queue.schedule(fn, arg);
    this.schedule();
  }

  runTask() {
    this.isScheduled = false;

    if (this.spinUntil >= 0 && this.node != null) {
      if (this.node.scheduler.currentTime < this.spinUntil) {
        this.schedule();
        return;
      }
      this.spinUntil = -1;
    }

    this.queue.flush();
  }

  spin(ms: number) {
    if (this.node != null) {
      this.spinUntil = this.node.scheduler.currentTime + ms;
    }
    return Promise.resolve();
  }
}

function runTask(task: TaskZone) {
  task.runTask();
}

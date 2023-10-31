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
  private queue = new MicrotaskQueue(this);
  private spinQueue = new MicrotaskQueue(this);

  private spinDuration = 0;
  private isScheduled = false;

  timeslice = 0;

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
      Zone.root.scheduleMicrotask(runRootTask, this);
    }
  }

  scheduleMicrotask<T>(fn: (x: T) => void, arg: T): void {
    const queue = this.spinDuration > 0 ? this.spinQueue : this.queue;
    queue.schedule(fn, arg);
    this.schedule();
  }

  runTask(timeslice: number) {
    this.isScheduled = false;

    if (this.spinDuration > 0 && this.node != null) {
      this.spinDuration -= timeslice;
      if (this.spinDuration >= 0) {
        this.schedule();
        return;
      }
      this.spinDuration = 0;
      const spinQueue = this.spinQueue;
      this.spinQueue = this.queue;
      this.queue = spinQueue;
    }

    this.queue.flush();
  }

  spin(ms: number) {
    if (this.node != null) {
      this.spinDuration = ms;
    }
    return Promise.resolve();
  }
}

function runRootTask(task: TaskZone) {
  task.runTask(0);
}

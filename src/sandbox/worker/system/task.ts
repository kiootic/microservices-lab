import { MicrotaskQueue, Zone } from "../runtime/zone";

export interface Task {
  id: number;
  nodeID: string | null;
  fn: string;
}

export interface TaskOwner {
  scheduleTask(task: TaskZone): void;
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
  private isScheduled = false;
  private readonly owner: TaskOwner | null;
  private readonly queue = new MicrotaskQueue(this);

  constructor(
    owner: TaskOwner | null,
    nodeID: string | null,
    fn: string,
    caller?: Task,
  ) {
    const id = nextTaskID++;
    const task: Task = { id, nodeID, fn };
    super(`task:${nodeID}:${fn}:${id}`, { task, caller });
    this.task = task;
    this.owner = owner;
  }

  scheduleMicrotask<T>(fn: (x: T) => void, arg: T): void {
    this.queue.schedule(fn, arg);
    if (!this.isScheduled) {
      this.isScheduled = true;
      if (this.owner != null) {
        this.owner.scheduleTask(this);
      } else {
        Zone.root.scheduleMicrotask(runTask, this);
      }
    }
  }

  flushMicrotasks() {
    this.isScheduled = false;
    this.queue.flush();
  }
}

function runTask(task: TaskZone) {
  task.flushMicrotasks();
}

import { Task } from "./task";

export interface Conditioner {
  onBeginInvoke?(service: string, fn: string): Promise<void>;
  onEndInvoke?(service: string, fn: string): Promise<void>;
  getTaskTimesliceFactor?(task: Task): number;
}

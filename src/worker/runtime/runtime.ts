import { RuntimeModule } from "../../shared/runtime";

export class Runtime {
  readonly module: RuntimeModule = {};
  readonly globals: object = {
    setTimeout: () => {},
  };
}

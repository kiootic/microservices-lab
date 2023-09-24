import { Runtime } from "../runtime/runtime";
import { makeGlobalObject } from "./global";
import { load } from "./loader";

export async function execute(
  scriptURL: string,
  runtime: Runtime,
): Promise<boolean> {
  const globals = makeGlobalObject(runtime.globals);

  return runtime.scheduler.run(async () => {
    interface Module {
      default: () => Promise<unknown>;
    }
    try {
      const module = load(
        runtime.logger.main,
        globals,
        scriptURL,
        new Map(),
      ) as Module;

      if (!("default" in module) || typeof module.default !== "function") {
        runtime.logger.main.error("No default export function found.");
        return false;
      }

      runtime.logger.main.debug("Run started...");
      await module.default();
      runtime.logger.main.debug("Run completed.");
      return true;
    } catch (err) {
      runtime.logger.main.error("Run failed.", { error: err });
      return false;
    }
  });
}

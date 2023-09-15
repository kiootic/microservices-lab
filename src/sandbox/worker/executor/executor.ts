import { Runtime } from "../runtime/runtime";
import { makeGlobalObject } from "./global";
import { load } from "./loader";

export async function execute(
  bundleJS: string,
  runtime: Runtime,
): Promise<unknown> {
  const globals = makeGlobalObject(runtime.globals);

  return runtime.scheduler.run(async () => {
    const module = load(globals, bundleJS, new Map()) as {
      default: () => Promise<unknown>;
    };
    return module.default();
  });
}

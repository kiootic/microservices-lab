import { Runtime } from "../runtime/runtime";
import { makeGlobalObject } from "./global";
import { load } from "./loader";

export async function execute(
  bundleJS: string,
  runtime: Runtime,
): Promise<unknown> {
  const globals = makeGlobalObject(runtime.globals);
  const module = load(globals, bundleJS, new Map()) as () => Promise<unknown>;

  const result$ = module();
  await runtime.scheduler.run();
  return await result$;
}

import { Logger } from "../runtime/logger";
import { scopeGuard } from "./guard";

export function load(
  logger: Logger,
  globals: object,
  bundleJS: string,
  modules: Map<string, unknown>,
): unknown {
  const require = (id: string) => {
    if (modules.has(id)) {
      return modules.get(id);
    }
    throw new TypeError(`Module ${id} not found`);
  };

  const bundleURL = URL.createObjectURL(
    new Blob([bundleJS], { type: "application/javascript" }),
  );
  logger.debug("Loading bundle...", { bundleURL });

  importScripts(bundleURL);
  const moduleFn = Reflect.get(globalThis, "$$module") as (
    this: unknown,
  ) => void;

  const context = Object.assign(Object.create(globals) as object, {
    module: { exports: {} },
    require,
  });

  moduleFn.call({ context: Object.freeze(context), guard: scopeGuard });
  return context.module.exports;
}

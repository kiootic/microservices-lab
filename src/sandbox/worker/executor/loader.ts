import { scopeGuard } from "./guard";

export function load(
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
  importScripts(bundleURL);
  const moduleFn: (this: unknown) => void = Reflect.get(globalThis, "$$module");

  const context = Object.assign(Object.create(globals), {
    module: { exports: {} },
    require,
  });

  moduleFn.call({ context: Object.freeze(context), guard: scopeGuard });
  return context.module.exports;
}

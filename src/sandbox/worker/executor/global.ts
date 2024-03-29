import BuiltInGlobals from "./built-ins.txt?raw";

const builtInGlobals = new Set(
  BuiltInGlobals.trim()
    .split("\n")
    .map((x) => x.replace(/#.+$/, "").trim())
    .filter((x) => x.length > 0),
);

function defineProperty(
  obj: unknown,
  key: string | symbol,
  getter: (this: unknown) => unknown,
) {
  Object.defineProperty(obj, key, {
    get: getter,
    configurable: true,
    enumerable: false,
  });
}

export function makeGlobalObject(globals: object) {
  const globalObject = {};

  for (const key of builtInGlobals) {
    defineProperty(globalObject, key, function () {
      return (globalThis as Record<string, unknown>)[key];
    });
  }

  for (const key of Reflect.ownKeys(globals)) {
    defineProperty(globalObject, key, function () {
      return (globals as Record<string | symbol, unknown>)[key];
    });
  }

  defineProperty(globalObject, "self", function () {
    return this;
  });
  defineProperty(globalObject, "globalThis", function () {
    return this;
  });

  return Object.freeze(globalObject);
}

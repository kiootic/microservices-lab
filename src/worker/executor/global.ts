import BuiltInGlobals from "./built-ins.txt?raw";

const builtInGlobals = new Set(
  BuiltInGlobals.trim()
    .split("\n")
    .map((x) => x.replace(/#.+$/, "").trim())
    .filter((x) => x.length > 0),
);

export function makeGlobalObject(globals: object) {
  const globalObject = {};

  for (const key of builtInGlobals) {
    Object.defineProperty(globalObject, key, {
      value: Reflect.get(globalThis, key),
      configurable: false,
      writable: false,
      enumerable: false,
    });
  }

  for (const key of Reflect.ownKeys(globals)) {
    Object.defineProperty(globalObject, key, {
      value: Reflect.get(globals, key),
      configurable: false,
      writable: false,
      enumerable: false,
    });
  }

  Object.defineProperty(globalObject, "self", {
    get() {
      return this;
    },
    configurable: false,
    enumerable: false,
  });
  Object.defineProperty(globalObject, "globalThis", {
    get() {
      return this;
    },
    configurable: false,
    enumerable: false,
  });

  return new Proxy(Object.freeze(globalObject), {
    get(globals, p) {
      return Reflect.get(globals, p);
    },
    has(globals, p) {
      return Reflect.has(globalThis, p) || Reflect.has(globals, p);
    },
  });
}

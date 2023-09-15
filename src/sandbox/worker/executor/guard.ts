export const scopeGuard = new Proxy(
  {
    // https://github.com/endojs/endo/blob/66bb24c0226add70fcb6dc01c55418f7582e7c0b/packages/ses/src/strict-scope-terminator.js
  },
  {
    get() {
      return undefined;
    },
    set(_, prop) {
      throw ReferenceError(`${String(prop)} is not defined`);
    },
    has(_, prop) {
      return prop in globalThis;
    },
    defineProperty() {
      return false;
    },
    deleteProperty() {
      return false;
    },
    setPrototypeOf() {
      return false;
    },
    getPrototypeOf() {
      return null;
    },
    getOwnPropertyDescriptor() {
      return undefined;
    },
    ownKeys() {
      return [];
    },
  },
);

// https://github.com/endojs/endo/blob/afe918b62a8674e9ce28382ad7a3e35999d89059/packages/ses/src/make-evaluate.js
export function makeEvalScope() {
  return new Proxy(
    { eval },
    {
      get: (target, p) => {
        if (p === "eval") {
          Reflect.deleteProperty(target, "eval");
          return eval;
        }
        return undefined;
      },
    },
  );
}

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

  const fn = new Function(`
    with (this.globals) {
      with (this.context) {
        with (this.evalScope) {
          return {
            __module() { eval(arguments[0]); }
          }['__module'];
        }
      }
    }
`);

  const module = { exports: null };
  const context = { module, require };

  const moduleFn = fn.call({ globals, context, evalScope: makeEvalScope() });
  moduleFn.call(globals, bundleJS);
  return module.exports;
}

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

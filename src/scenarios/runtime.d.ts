export * from "../shared/runtime";

export as namespace __rt;

declare global {
  interface Hooks {
    [x: string]: any;
  }
  namespace Runtime {
    function registerHook(name: string, value: any): void;
  }
  function Service<Name extends string>(
    name: Name,
  ): Runtime.ServiceConstructor<never>;
}

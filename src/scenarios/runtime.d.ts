export * from "../shared/runtime";

export as namespace __rt;

declare global {
  namespace Runtime {
    function defineConfig(name: string, value: any): any;
    function configure(name: string, fn: (value: any) => void): void;
    function configure(
      name: "system",
      fn: (value: Runtime.SystemConfig) => void,
    ): void;
  }
  function Service<Name extends string>(
    name: Name,
  ): Runtime.ServiceConstructor<never>;
}

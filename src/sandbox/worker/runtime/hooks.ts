type HooksObject<T> = {
  [K in keyof T & string]?: Array<T[K]>;
};

export class Hooks<T> {
  private readonly hooksMap = new Map<keyof T & string, unknown[]>();
  private isDirty = false;
  private hooksObj: Record<string, unknown> = {};

  registerHook<K extends keyof T & string>(name: K, value: T[K]) {
    let values = this.hooksMap.get(name);
    if (values == null) {
      values = [];
      this.hooksMap.set(name, values);
    }
    values.push(value);
    this.isDirty = true;
  }

  get hooks(): HooksObject<T> {
    if (this.isDirty) {
      const obj: Record<string, unknown> = {};
      for (const [key, values] of this.hooksMap) {
        obj[key] = Object.freeze(values.slice());
      }
      this.hooksObj = Object.freeze(obj);
    }
    return this.hooksObj as HooksObject<T>;
  }
}

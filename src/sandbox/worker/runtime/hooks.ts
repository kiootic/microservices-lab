export class Hooks<T> {
  private readonly hooksMap = new Map<keyof T & string, unknown>();
  private isDirty = false;
  private hooksObj: Record<string, unknown> = {};

  registerHook<K extends keyof T & string>(
    name: K,
    appendFn: (value: T[K] | undefined) => T[K],
  ) {
    let value = this.hooksMap.get(name);
    value = appendFn(value as T[K] | undefined);
    this.hooksMap.set(name, value);
    this.isDirty = true;
  }

  get hooks(): Partial<T> {
    if (this.isDirty) {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of this.hooksMap) {
        obj[key] = value;
      }
      this.hooksObj = Object.freeze(obj);
    }
    return this.hooksObj as Partial<T>;
  }
}

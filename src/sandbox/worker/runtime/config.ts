export class ConfigStore<T> {
  private readonly values = new Map<keyof T, unknown>();
  private readonly callbacks = new Map<keyof T, ((value: unknown) => void)[]>();

  define<K extends keyof T>(name: K, value: T[K]): T[K] {
    if (this.values.has(name)) {
      throw new TypeError(`Duplicated config ${String(name)}`);
    }

    this.values.set(name, value);
    const callbacks = this.callbacks.get(name);
    if (callbacks != null) {
      callbacks.forEach((cb) => cb(value));
    }
    return value;
  }

  configure<K extends keyof T>(name: K, fn: (value: T[K]) => void) {
    if (this.values.has(name)) {
      const value = this.values.get(name) as T[K];
      fn(value);
      return;
    }

    const callbacks = this.callbacks.get(name) ?? [];
    this.callbacks.set(name, [...callbacks, fn as (value: unknown) => void]);
  }
}

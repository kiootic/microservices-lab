export class ConfigStore<T> {
  private readonly values = new Map<string, unknown>();
  private readonly callbacks = new Map<string, ((value: unknown) => void)[]>();

  define<K extends string, T>(name: K, value: T): T & { __name?: K } {
    if (this.values.has(name)) {
      throw new TypeError(`Duplicated config ${String(name)}`);
    }

    this.values.set(name, value);
    const callbacks = this.callbacks.get(name);
    if (callbacks != null) {
      callbacks.forEach((cb) => cb(value));
    }
    return value as T & { __name?: K };
  }

  configure<K extends keyof T>(name: keyof T, fn: (value: T[K]) => void) {
    const key = name as string;
    if (this.values.has(key)) {
      const value = this.values.get(key) as T[K];
      fn(value);
      return;
    }

    const callbacks = this.callbacks.get(key) ?? [];
    this.callbacks.set(key, [...callbacks, fn as (value: unknown) => void]);
  }
}

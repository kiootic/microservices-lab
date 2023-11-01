class Cache extends Service("cache") {
  readonly cache = new Map<string, string>();
  readonly locks = new Map<string, string>();
  readonly metrics = {
    hit: metrics.counter("services.cache.hit"),
    miss: metrics.counter("services.cache.miss"),
  };

  async get(key: string) {
    const value = this.cache.get(key);
    (value == null ? this.metrics.miss : this.metrics.hit).increment();
    return this.cache.get(key) ?? null;
  }

  async set(key: string, value: string) {
    return this.cache.set(key, value);
  }

  async lock(key: string, token: string) {
    let lockToken = this.locks.get(key);
    if (lockToken == null) {
      this.locks.set(key, token);
      lockToken = token;
    }
    return lockToken;
  }

  async unlock(key: string, token: string) {
    let lockToken = this.locks.get(key);
    if (lockToken == token) {
      this.locks.delete(key);
    }
  }

  async flush() {
    this.cache.clear();
  }
}
Runtime.defineService(Cache);

Runtime.configure("system", (config) =>
  config.adjustServicePerformance("cache", 10),
);

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof Cache> {}
}

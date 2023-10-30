class API extends Service("api") {
  async query(x: string) {
    const n =
      hooks["services.api.num-queries"]?.reduce((a, get) => a + get(), 0) ?? 1;

    const tasks = new Array(n).fill(0).map(() => services.db.query(x));
    return await Promise.race(tasks);
  }
}
Runtime.defineService(API);

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof API> {}
  interface Hooks {
    "services.api.num-queries": () => number;
  }
}

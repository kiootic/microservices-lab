class API extends Service("api") {
  async query(x: string) {
    const n = config.numQueries;
    const tasks = new Array(n).fill(0).map(() => services.db.query(x));
    return await Promise.race(tasks);
  }
}
Runtime.defineService(API);

const config = Runtime.defineConfig("services.api", {
  numQueries: 1,
});

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof API> {}
  interface Config extends Runtime.ConfigType<typeof config> {}
}

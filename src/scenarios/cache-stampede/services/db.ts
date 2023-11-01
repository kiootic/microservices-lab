class DB extends Service("db") {
  async query(x: string) {
    // Slow query
    await spin(20 * random.pareto(10));
    return "value: " + x;
  }
}
Runtime.defineService(DB);

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof DB> {}
}

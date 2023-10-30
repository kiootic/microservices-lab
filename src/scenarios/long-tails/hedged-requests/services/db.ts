class DB extends Service("db") {
  async query(x: string) {
    // Long tailed distibution
    const latency = random.pareto(2.5);
    await spin(latency);
    return x;
  }
}
Runtime.defineService(DB);

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof DB> {}
}

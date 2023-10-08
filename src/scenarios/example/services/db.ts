class DB extends Service("db") {
  private readonly data = new Map<string, number>();
  async get(id: string) {
    await delay(100);
    return this.data.get(id) ?? 0;
  }
  async set(id: string, value: number) {
    await delay(100);
    this.data.set(id, value);
  }
}
Runtime.defineService(DB);

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof DB> {}
}

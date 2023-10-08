class Counter extends Service("counter") {
  async increment(id: string) {
    let counter: number = await services.db.get(id);
    counter++;
    await services.db.set(id, counter);

    return counter;
  }
  async decrement(id: string) {
    let counter: number = await services.db.get(id);
    counter--;
    await services.db.set(id, counter);

    return counter;
  }
}
Runtime.defineService(Counter);

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof Counter> {}
}

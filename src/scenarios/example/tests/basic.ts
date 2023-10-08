Runtime.defineTest("test counters")
  .users(1000)
  .run(async (user) => {
    const id = `user-${user.id}`;
    let counter = 0;

    const start = Date.now();
    let elapsed = 0;
    for (let i = 0; i < 20; i++) {
      const ms = Math.max(0, Math.floor(1000 + random.normal() * 100));
      await delay(ms);
      if (random.uniform() > 0.5) {
        counter++;
        const updated: number = await services.counter.increment(id);
        expect(updated).toEqual(counter);
      } else {
        counter--;
        const updated: number = await services.counter.decrement(id);
        expect(updated).toEqual(counter);
      }
      elapsed += ms + 200;
      expect(Date.now() - start).toEqual(elapsed);
    }
  });

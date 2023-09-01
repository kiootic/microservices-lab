defineTest("test counters")
  .users(1000)
  .run(async (user) => {
    const id = `user-${user.id}`;
    let counter = 0;

    for (let i = 0; i < 20; i++) {
      await delay(1000 + random.normal() * 100);
      if (random.uniform() > 0.5) {
        counter++;
        const updated = await services.counter.increment(id);
        expect(updated).toEqual(counter);
      } else {
        counter--;
        const updated = await services.counter.decrement(id);
        expect(updated).toEqual(counter);
      }
    }
  });

async function test(user: Runtime.VirtualUser) {
  await delay(random.uniform() * 1000);
  for (let i = 0; i < 1000; i++) {
    await delay(1000 + random.uniform() * 100);
    await services.api.query(`user:${user.id}:${i}`);
  }
}

Runtime.defineTest("naive query")
  .users(20)
  .setup(() =>
    Runtime.configure("services.api", (config) => {
      config.numQueries = 1;
    }),
  )
  .run(test);

Runtime.defineTest("hedged requests (n=2)")
  .users(20)
  .setup(() =>
    Runtime.configure("services.api", (config) => {
      config.numQueries = 2;
    }),
  )
  .run(test);

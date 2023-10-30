let numQuery = 1;
Runtime.registerHook("services.api.num-queries", () => numQuery);

async function test(n: number, user: Runtime.VirtualUser) {
  numQuery = n;
  await delay(random.uniform() * 1000);
  for (let i = 0; i < 1000; i++) {
    await delay(1000 + random.uniform() * 100);
    await services.api.query(`user:${user.id}:${i}`);
  }
}

Runtime.defineTest("naive query")
  .users(20)
  .run((user) => test(1, user));

Runtime.defineTest("parallel query (n=2)")
  .users(20)
  .run((user) => test(2, user));

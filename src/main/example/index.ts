defineTest("async with delay")
  .users(10)
  .run(async (user) => {
    await Promise.resolve();
    const start = Date.now();
    for (let j = 0; j < 10; j++) {
      await delay(user.id * 1000);
    }
    expect(Date.now() - start).toEqual(user.id * 10000);
  });

export default async function () {
  await runTests();
}

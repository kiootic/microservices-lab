let retryDelayFn: (retryCount: number) => number | undefined;

function scheduleFlushCache() {
  const flushDelay = 5 * 60 * 1000; // 3 mins
  setTimeout(() => {
    services.cache.flush();
  }, flushDelay);
}

async function test() {
  await delay(random.exponential() * 60 * 1000);
  for (let i = 0; i < 1000; i++) {
    await delay(random.exponential() * 500);

    const key = String(Math.floor(random.exponential() * 10));
    const result = await utils.retryOnError(async (retryCount) => {
      const retryDelay = retryDelayFn?.(retryCount) ?? 0;
      await delay(retryDelay);
      return services.api.query(key);
    }, 100);

    expect(result).toEqual(`value: ${key}`);
  }
}

Runtime.configure("system", (config) => {
  config.onInvoke((next) => () => utils.timeout(next(), 1000));
});

Runtime.defineTest("without cache")
  .users(200)
  .fallible()
  .setup(() => {
    Runtime.configure("services.api", (config) => {
      config.cache = "none";
    });
    retryDelayFn = () => 0;
  })
  .run(test);

Runtime.defineTest("with cache")
  .users(200)
  .fallible()
  .setup(() => {
    Runtime.configure("services.api", (config) => {
      config.cache = "naive";
    });
    retryDelayFn = () => 0;
  })
  .run(test);

Runtime.defineTest("cache stampede")
  .users(200)
  .fallible()
  .setup(scheduleFlushCache)
  .setup(() => {
    Runtime.configure("services.api", (config) => {
      config.cache = "naive";
    });
    retryDelayFn = () => 0;
  })
  .run(test);

Runtime.defineTest("constant backoff")
  .users(200)
  .setup(scheduleFlushCache)
  .setup(() => {
    Runtime.configure("services.api", (config) => {
      config.cache = "naive";
    });
    retryDelayFn = () => 1000;
  })
  .run(test);

let maxRetryDelay = 0;
Runtime.defineTest("exponential backoff")
  .users(200)
  .setup(scheduleFlushCache)
  .setup(() => {
    Runtime.configure("services.api", (config) => {
      config.cache = "naive";
    });
    retryDelayFn = (x) => {
      const delay = Math.pow(2, x) * 100;
      maxRetryDelay = Math.max(maxRetryDelay, delay);
      return delay;
    };
  })
  .teardown(() => {
    console.log(`Max retry delay: ${maxRetryDelay}`);
  })
  .run(test);

Runtime.defineTest("locked cache population")
  .users(200)
  .setup(scheduleFlushCache)
  .setup(() => {
    Runtime.configure("services.api", (config) => {
      config.cache = "lock";
    });
    retryDelayFn = () => 0;
  })
  .run(test);

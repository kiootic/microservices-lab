class API extends Service("api") {
  static readonly replicas = 3;

  async query(x: string) {
    switch (config.cache) {
      case "none": {
        return await services.db.query(x);
      }

      case "naive": {
        let value = await services.cache.get(x);
        if (value != null) {
          return value;
        }
        value = await services.db.query(x);
        await services.cache.set(x, value);
        return value;
      }

      case "lock": {
        let value = await services.cache.get(x);
        if (value != null) {
          return value;
        }

        const lockToken = String(context.task?.id);
        while ((await services.cache.lock(x, lockToken)) !== lockToken) {
          await delay(200);
          value = await services.cache.get(x);
          if (value != null) {
            return value;
          }
        }
        try {
          value = await services.db.query(x);
          await services.cache.set(x, value);
          return value;
        } finally {
          await services.cache.unlock(x, lockToken);
        }
      }
    }
  }
}
Runtime.defineService(API);

type CacheStrategy = "none" | "naive" | "lock";

const config = Runtime.defineConfig("services.api", {
  cache: "none" as CacheStrategy,
});

declare global {
  interface SystemServices extends Runtime.ServiceType<typeof API> {}
  interface Config extends Runtime.ConfigType<typeof config> {}
}

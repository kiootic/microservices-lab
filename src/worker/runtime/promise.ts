const PENDING = 0;
const FULFILLED = 1;
const REJECTED = 2;

type PromiseState = typeof PENDING | typeof FULFILLED | typeof REJECTED;

function scheduleMicrotask<T>(fn: (x: T) => void, arg: T) {
  queueMicrotask(() => fn(arg));
}

export interface PromiseInternals {
  make<T>(): Promise<T>;
  resolve<T>(promise: Promise<T>, value: T | PromiseLike<T>): void;
  reject<T>(promise: Promise<T>, reason: unknown): void;
}

type Executor = (
  resolve: (value: unknown) => void,
  reject: (reason: unknown) => void,
) => void;

export function makePromise(
  name: string,
  schedule = scheduleMicrotask,
): [PromiseConstructor, PromiseInternals] {
  const raw = Symbol();

  const Promise = {
    [name]: class {
      __state: PromiseState = PENDING;
      __value: unknown = undefined;
      __child: Promise | undefined = undefined;
      __sibling: Promise | undefined = undefined;
      __onFulfill: ((value: unknown) => unknown) | undefined = undefined;
      __onReject: ((reason: unknown) => unknown) | undefined = undefined;

      constructor(executor: typeof raw | Executor) {
        if (executor === raw) {
          return;
        }
        execute(this, executor);
      }

      then(
        onFulfill?: (value: unknown) => unknown,
        onReject?: (value: unknown) => unknown,
      ) {
        const promise = new Promise(raw);
        promise.__onFulfill =
          typeof onFulfill === "function" ? onFulfill : undefined;
        promise.__onReject =
          typeof onReject === "function" ? onReject : undefined;
        chain(this, promise);
        return promise;
      }

      catch(onReject?: (value: unknown) => unknown) {
        return this.then(undefined, onReject);
      }

      static resolve(value: unknown) {
        if (value instanceof Promise) {
          return value;
        }
        const promise = new Promise(raw);
        resolve(promise, value);
        return promise;
      }

      static allSettled(promises: Promise[]) {
        const result = new Array(promises.length);
        let completed = 0;
        return new this((resolve) => {
          promises.forEach((p, i) =>
            p
              .then(
                (value) => {
                  result[i] = { status: "fulfilled", value };
                },
                (reason) => {
                  result[i] = { status: "reject", reason };
                },
              )
              .then(() => {
                completed++;
                if (completed == promises.length) resolve(result);
              }),
          );
        });
      }
    },
  }[name];
  type Promise = InstanceType<typeof Promise>;

  const internal = {
    make: () => new Promise(raw),
    resolve,
    reject,
  };

  return [
    Promise as unknown as PromiseConstructor,
    internal as unknown as PromiseInternals,
  ];

  function reaction(self: Promise, state: PromiseState, value: unknown) {
    const onFulfill = self.__onFulfill;
    const onReject = self.__onReject;
    self.__onFulfill = undefined;
    self.__onReject = undefined;

    if (state === FULFILLED) {
      if (onFulfill) {
        try {
          resolve(self, onFulfill(value));
        } catch (err) {
          reject(self, err);
        }
      } else {
        resolve(self, value);
      }
    }
    if (state === REJECTED) {
      if (onReject) {
        try {
          resolve(self, onReject(value));
        } catch (err) {
          reject(self, err);
        }
      } else {
        reject(self, value);
      }
    }
  }

  function notify(self: Promise) {
    let child = self.__child;
    self.__child = undefined;
    if (child == null) {
      return;
    }

    const state = self.__state;
    const value = self.__value;
    while (child != null) {
      const next: Promise | undefined = child.__sibling;
      child.__sibling = undefined;

      reaction(child, state, value);

      child = next;
    }
  }

  function settle(self: Promise, value: unknown, state: PromiseState) {
    self.__value = value;
    self.__state = state;

    if (self.__child != null) {
      schedule(notify, self);
    }
  }

  function resolve(self: Promise, value: unknown) {
    if (value === self) {
      reject(self, new TypeError());
    }

    if (value instanceof Promise) {
      chain(value, self);
      return;
    }

    if (typeof value === "object" || typeof value === "function") {
      let then;
      try {
        then = (value as Record<string, unknown>)?.then;
      } catch (err) {
        reject(self, err);
        return;
      }

      if (typeof then === "function") {
        schedule(execute.bind(undefined, self), then.bind(value));
        return;
      }
    }

    settle(self, value, FULFILLED);
  }

  function reject(self: Promise, reason: unknown) {
    settle(self, reason, REJECTED);
  }

  function execute(self: Promise, fn: Executor) {
    let executed = false;
    const _resolve = (value: unknown) => {
      if (!executed) {
        executed = true;
        resolve(self, value);
      }
    };
    const _reject = (reason: unknown) => {
      if (!executed) {
        executed = true;
        reject(self, reason);
      }
    };

    try {
      fn(_resolve, _reject);
    } catch (err) {
      _reject(err);
    }
  }

  function chain(self: Promise, promise: Promise) {
    if (
      (self.__state === FULFILLED || self.__state === REJECTED) &&
      self.__child == null
    ) {
      schedule(notify, self);
    }

    if (self.__child == null) {
      self.__child = promise;
    } else {
      let child = self.__child;
      while (child.__sibling != null) {
        child = child.__sibling;
      }
      child.__sibling = promise;
    }
  }
}

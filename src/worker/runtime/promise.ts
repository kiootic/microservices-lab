const PENDING = 0;
const FULFILLED = 1;
const REJECTED = 2;

type PromiseState = typeof PENDING | typeof FULFILLED | typeof REJECTED;

const raw = Symbol();

declare interface PromiseConstructor<T extends Promise = Promise> {
  new (
    executor:
      | typeof raw
      | ((
          resolve: (value: unknown) => void,
          reject: (reason: unknown) => void,
        ) => void),
  ): T;
  schedule<T>(fn: (x: T) => void, arg: T): void;
}

export class Promise {
  static schedule<T>(fn: (x: T) => void, arg: T) {
    queueMicrotask(() => fn(arg));
  }

  #state: PromiseState = PENDING;
  #value: unknown = undefined;
  #children: Promise[] | undefined = [];
  #parent: Promise | undefined = undefined;
  #onFulfill: ((value: unknown) => unknown) | undefined = undefined;
  #onReject: ((reason: unknown) => unknown) | undefined = undefined;

  constructor(
    executor:
      | typeof raw
      | ((
          resolve: (value: unknown) => void,
          reject: (reason: unknown) => void,
        ) => void),
  ) {
    if (executor === raw) {
      return;
    }
    try {
      let settling = false;
      executor(
        (value) => {
          if (settling) {
            return;
          }
          settling = true;
          this.#fulfill(value);
        },
        (reason) => {
          if (settling) {
            return;
          }
          settling = true;
          this.#reject(reason);
        },
      );
    } catch (err) {
      this.#reject(err);
    }
  }

  static #notify(self: Promise) {
    const children = self.#children;
    self.#children = undefined;
    if (children == undefined) {
      return;
    }

    for (const child of children) {
      Promise.#chain(child);
    }
  }

  #settle(value: unknown, state: PromiseState) {
    this.#value = value;
    this.#state = state;

    (this.constructor as PromiseConstructor).schedule(Promise.#notify, this);
  }

  #reject(reason: unknown) {
    this.#settle(reason, REJECTED);
  }

  #fulfill(value: unknown) {
    let executed = false;
    try {
      if (value === this) throw new TypeError();

      if (typeof value === "object" || typeof value === "function") {
        const then = (value as Record<string, unknown>)?.then;
        if (typeof then === "function") {
          then.call(
            value,
            (value: unknown) => {
              if (executed) return;
              executed = true;
              this.#fulfill(value);
            },
            (value: unknown) => {
              if (executed) return;
              executed = true;
              this.#reject(value);
            },
          );
          return;
        }
      }

      this.#settle(value, FULFILLED);
    } catch (err) {
      if (executed) return;
      this.#reject(err);
    }
  }

  static #chain(self: Promise) {
    if (self.#parent == null) {
      return;
    }

    const value = self.#parent.#value;
    if (self.#parent.#state === FULFILLED) {
      const onFulfill = self.#onFulfill;
      if (onFulfill) {
        try {
          self.#fulfill(onFulfill(value));
        } catch (err) {
          self.#reject(err);
        }
      } else {
        self.#fulfill(value);
      }
    }
    if (self.#parent.#state === REJECTED) {
      const onReject = self.#onReject;
      if (onReject) {
        try {
          self.#fulfill(onReject(value));
        } catch (err) {
          self.#reject(err);
        }
      } else {
        self.#reject(value);
      }
    }
  }

  then(
    onFulfill?: (value: unknown) => unknown,
    onReject?: (value: unknown) => unknown,
  ) {
    const promise: this = new (this.constructor as PromiseConstructor<this>)(
      raw,
    );
    promise.#parent = this;
    promise.#onFulfill =
      typeof onFulfill === "function" ? onFulfill : undefined;
    promise.#onReject = typeof onReject === "function" ? onReject : undefined;

    if (this.#state === FULFILLED || this.#state === REJECTED) {
      (this.constructor as PromiseConstructor).schedule(
        Promise.#chain,
        promise,
      );
    } else {
      this.#children?.push(promise);
    }
    return promise;
  }

  catch(onReject?: (value: unknown) => unknown) {
    return this.then(undefined, onReject);
  }

  static resolve(value: unknown) {
    const promise = new this(raw);
    promise.#fulfill(value);
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
}

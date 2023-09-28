export type Parser<Out, In = unknown> = (x: In) => Out;

function _typeOf(value: unknown) {
  if (value === null) {
    return "null";
  } else if (value === undefined) {
    return "undefined";
  }
  return typeof value;
}

function makePrimitiveParser<T>(type: string, parse: Parser<T>): Parser<T> {
  return (x) => {
    if (_typeOf(x) !== type) {
      throw new TypeError(`expected ${type}; got ${_typeOf(x)}`);
    }
    return parse(x);
  };
}

function parseOneOf<T>(...values: T[]): Parser<T> {
  return (x) => {
    if (!(values as unknown[]).includes(x)) {
      throw new TypeError(
        `expected one of ${JSON.stringify(values)}; got ${JSON.stringify(x)}`,
      );
    }
    return x as T;
  };
}

type ObjectParser = Record<string, CallableFunction>;
type ParsedObject<T extends ObjectParser> = {
  [K in keyof T]: T[K] extends Parser<T> ? ReturnType<T[K]> : never;
};

function parseObject<T extends ObjectParser>(
  parser: T,
): Parser<ParsedObject<T>> {
  return (x) => {
    if (_typeOf(x) !== "object") {
      throw new TypeError(`expected object; got ${_typeOf(x)}`);
    }

    const input = x as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [field, parse] of Object.entries(parser)) {
      try {
        output[field] = parse(input[field]);
      } catch (e) {
        throw new TypeError(`field ${field}: ${String(e)}`, { cause: e });
      }
    }

    return output as ParsedObject<T>;
  };
}

function parseRecord<T>(parse: Parser<T>): Parser<Partial<Record<string, T>>> {
  return (x) => {
    if (_typeOf(x) !== "object") {
      throw new TypeError(`expected object; got ${_typeOf(x)}`);
    }

    const output: Partial<Record<string, T>> = {};
    for (const [field, value] of Object.entries(x as object)) {
      try {
        output[field] = parse(value);
      } catch (e) {
        throw new TypeError(`key ${field}: ${String(e)}`, { cause: e });
      }
    }

    return output;
  };
}

function parseJSON<T>(parse: Parser<T>): Parser<T> {
  return (json) => {
    if (_typeOf(json) !== "string") {
      throw new TypeError(`expected JSON; got ${_typeOf(json)}`);
    }
    try {
      return parse(JSON.parse(json as string));
    } catch (e) {
      throw new TypeError(`parse JSON: ${String(e)}`, { cause: e });
    }
  };
}

export const parse = {
  json: parseJSON,
  string: makePrimitiveParser("string", String),
  number: makePrimitiveParser("number", String),
  boolean: makePrimitiveParser("boolean", String),
  oneOf: parseOneOf,
  object: parseObject,
  record: parseRecord,
};

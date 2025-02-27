import { fromValue } from "./json.ts";
import { Struct, Value } from "./types.ts";

export type Schema<R> = (value: Value) => R;

export function expect<R>(schema: Schema<R>, value: Value): R {
  return schema(value);
}

export function oneOf<T, VS extends T[]>(
  schema: Schema<T>,
  values: VS,
): Schema<VS[number]> {
  return (value) => {
    const result = schema(value);
    if (!values.includes(result)) {
      throw new Error("invalid");
    }
    return result;
  };
}

export function i4(): Schema<bigint> {
  return (value) => {
    expectKind("Int32", value);
    return value.value;
  };
}

export function boolean(): Schema<boolean> {
  return (value) => {
    console.log(fromValue(value));
    expectKind("Boolean", value);
    return value.value;
  };
}

export function booleanTrue(): Schema<true> {
  return (value) => {
    expectKind("Boolean", value);
    if (value.value !== true) {
      throw new Error("invalid");
    }
    return true;
  };
}

export function string(): Schema<string> {
  return (value) => {
    expectKind("String", value);
    return value.value;
  };
}

export function double(): Schema<number> {
  return (value) => {
    expectKind("Double", value);
    return value.value;
  };
}

export function date(): Schema<Date> {
  return (value) => {
    expectKind("DateTime", value);
    return value.value;
  };
}

export function bytes(): Schema<Uint8Array> {
  return (value) => {
    expectKind("Bytes", value);
    return value.value;
  };
}

export function struct<S extends Record<string, Schema<unknown>>>(
  schema: S,
): Schema<RecordOf<S>> {
  return (value) => {
    expectKind("Struct", value);
    const obj = {} as RecordOf<S>;
    for (const key of typedObjectKeys(schema)) {
      obj[key] = readStructMember(schema, key, value);
    }
    return obj;
  };
}

export function array<T>(schema: Schema<T>): Schema<T[]> {
  return (value) => {
    expectKind("Array", value);
    return value.elements.map(schema);
  };
}

export function tuple<TS extends Schema<unknown>[]>(
  ...schemas: TS
): Schema<TupleOf<TS>> {
  return (value) => {
    expectKind("Array", value);
    const arr = [];
    for (let i = 0; i < schemas.length; ++i) {
      arr[i] = schemas[i](value.elements[i]);
    }
    return arr as TupleOf<TS>; // TODO: types
  };
}

type ValueOf<F extends Schema<unknown>> = F extends Schema<infer T> ? T : never;

type RecordOf<S extends Record<string, Schema<unknown>>> = {
  [K in keyof S]: ValueOf<S[K]>;
};

type TupleOf<TS extends unknown[]> = TS extends [] ? []
  : TS extends [infer Head extends Schema<unknown>, ...infer Rest]
    ? [ValueOf<Head>, ...TupleOf<Rest>]
  : never;

function readStructMember<
  S extends Record<string, Schema<unknown>>,
  K extends keyof S,
>(schema: S, key: K, struct: Struct): ValueOf<S[K]> {
  const value = struct.members[key as string];
  if (value === undefined) {
    throw new Error("invalid");
  }
  return schema[key](value) as ValueOf<S[K]>; // TODO: types
}

function expectKind<T extends Value & { readonly kind: K }, K extends string>(
  kind: K,
  value: Value,
): asserts value is T {
  if (value.kind !== kind) {
    throw new Error("invalid");
  }
}

function typedObjectKeys<T extends Record<string, unknown>>(
  obj: T,
): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

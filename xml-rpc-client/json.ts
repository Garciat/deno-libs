import {
  Array,
  Boolean,
  Bytes,
  DateTime,
  Double,
  Int32,
  MethodCall,
  String,
  Struct,
  Value,
  XmlRpcType,
} from "./types.ts";

// NOTE: ignores undefined params
export function methodCall(methodName: string, ...params: unknown[]) {
  return new MethodCall(
    methodName,
    params.filter((v) => v !== undefined).map(valueFromJSON),
  );
}

export function fromValue(value: Value): unknown {
  switch (value.kind) {
    case "Int32":
      return value.value;
    case "Boolean":
      return value.value;
    case "String":
      return value.value;
    case "Double":
      return value.value;
    case "DateTime":
      return value.value;
    case "Bytes":
      return value.value;
    case "Struct":
      return fromStruct(value);
    case "Array":
      return value.elements.map(fromValue);
    default:
      value satisfies never;
      throw new Error("unknown value kind: " + value);
  }
}

export function fromStruct(struct: Struct): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(struct.members).map((
      [key, value],
    ) => [key, fromValue(value)]),
  );
}

function valueFromJSON(obj: unknown): Value {
  switch (typeof obj) {
    case "string":
      return new String(obj);
    case "number":
      // best guess :shrug:
      return Number.isInteger(obj) ? new Int32(BigInt(obj)) : new Double(obj);
    case "bigint":
      return new Int32(obj);
    case "boolean":
      return new Boolean(obj);
    case "object":
      if (obj === null) {
        throw new Error("type not allowed: null");
      }
      if (obj instanceof XmlRpcType) {
        return obj as Value;
      }
      if (obj instanceof Date) {
        return new DateTime(obj);
      }
      if (obj instanceof Uint8Array) {
        return new Bytes(obj);
      }
      if (obj instanceof ArrayBuffer) {
        return new Bytes(new Uint8Array(obj));
      }
      if (globalThis.Array.isArray(obj)) {
        return arrayFromJSON(obj);
      }
      return structFromJSON(obj);
    case "symbol":
    case "undefined":
    case "function":
      throw new Error("type not allowed: " + typeof obj);
  }
}

function arrayFromJSON(arr: unknown[]): Array {
  return new Array(arr.map(valueFromJSON));
}

function structFromJSON(obj: object): Struct {
  const members = Object.fromEntries(
    Object.entries(obj).map((
      [key, value],
    ) => [globalThis.String(key), valueFromJSON(value)]),
  );

  return new Struct(members);
}

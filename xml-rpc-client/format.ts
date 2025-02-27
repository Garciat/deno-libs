import { encodeBase64 } from "@std/encoding";

import { Array, Bytes, DateTime, MethodCall, Struct, Value } from "./types.ts";

export function formatMethodCall(call: MethodCall): string {
  let out = `<?xml version="1.0"?>\n`;

  out += `<methodCall>`;

  out += `<methodName>${call.methodName}</methodName>`;

  out += `<params>`;

  for (const param of call.params) {
    out += `<param><value>${formatValue(param)}</value></param>`;
  }

  out += `</params>`;

  out += `</methodCall>`;

  return out;
}

function formatValue(value: Value): string {
  switch (value.kind) {
    case "Int32":
      return `<i4>${value.value}</i4>`;
    case "Boolean":
      return `<boolean>${value.value ? 1 : 0}</boolean>`;
    case "String":
      return `<string>${value.value}</string>`;
    case "Double":
      return `<double>${value.value}</double>`;
    case "DateTime":
      return formatDateTime(value);
    case "Bytes":
      return formatBytes(value);
    case "Struct":
      return formatStruct(value);
    case "Array":
      return formatArray(value);
    default:
      value satisfies never;
      throw new Error("unexpected object: " + value);
  }
}

function formatDateTime(value: DateTime): string {
  const str = value.value.toISOString()
    .replaceAll("-", "")
    .replace("Z", "");
  return `<dateTime.iso8601>${str}</dateTime.iso8601>`;
}

function formatBytes(value: Bytes): string {
  const str = encodeBase64(value.value);
  return `<base64>${str}</base64>`;
}

function formatStruct(value: Struct): string {
  let out = "";

  out += `<struct>`;

  for (const [k, v] of Object.entries(value.members)) {
    out += `<member>`;

    out += `<name>${k}</name>`;

    out += `<value>${formatValue(v)}</value>`;

    out += `</member>`;
  }

  out += `</struct>`;

  return out;
}

function formatArray(value: Array): string {
  let out = "";

  out += `<array>`;
  out += `<data>`;

  for (const element of value.elements) {
    out += `<value>${formatValue(element)}</value>`;
  }

  out += `</data>`;
  out += `</array>`;

  return out;
}

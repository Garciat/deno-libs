import { parse as parseXML, xml_node } from "@libs/xml";

import {
  Array,
  Boolean,
  Bytes,
  DateTime,
  Double,
  Fault,
  Int32,
  MethodResponse,
  String,
  Struct,
  Value,
} from "./types.ts";
import { expect, i4, string, struct } from "./schema.ts";

export function parseMethodResponse(input: string): MethodResponse {
  const doc = parseXML(input);

  const methodResponseNode = getRequiredChildNode(doc, "methodResponse");

  const faultNode = getChildNode(methodResponseNode, "fault");
  if (faultNode) {
    const fault = parseFaultNode(faultNode);
    return new MethodResponse(fault);
  }

  const paramsNode = getChildNode(methodResponseNode, "params");
  if (paramsNode) {
    const value = parseParamsNode(paramsNode);
    return new MethodResponse(value);
  }

  throw new Error("invalid");
}

const FaultNodeSchema = struct({
  "faultCode": i4(),
  "faultString": string(),
});

function parseFaultNode(node: xml_node): Fault {
  const valueNode = getRequiredChildNode(node, "value");

  const value = parseValueNode(valueNode);

  const { faultCode, faultString } = expect(FaultNodeSchema, value);

  return new Fault(faultCode, faultString);
}

function parseParamsNode(node: xml_node): Value {
  const paramNode = getRequiredChildNode(node, "param");
  const valueNode = getRequiredChildNode(paramNode, "value");
  return parseValueNode(valueNode);
}

function parseValueNode(node: xml_node): Value {
  const [inner] = node["~children"];

  switch (inner["~name"]) {
    case "i4":
    case "int":
      return new Int32(BigInt(inner["#text"]));
    case "boolean":
      return new Boolean(globalThis.Boolean(parseInt(inner["#text"])));
    case "string":
      return new String(inner["#text"]);
    case "double":
      return new Double(parseFloat(inner["#text"]));
    case "dateTime.iso8601":
      return parseDateTime(inner["#text"]);
    case "base64":
      return new Bytes(new TextEncoder().encode(atob(inner["#text"])));
    case "struct":
      return parseStruct(inner as xml_node);
    case "array":
      return parseArray(inner as xml_node);
    default:
      throw new Error("unknown node type: " + inner["~name"]);
  }
}

function parseDateTime(input: string): DateTime {
  // 	19980717T14:08:55
  const match = input.match(
    /^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})$/,
  );
  if (!match) {
    throw new Error("invalid datetime");
  }

  const [, year, month, day, hour, minutes, seconds] = match;

  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minutes}:${seconds}Z`,
  );

  return new DateTime(date);
}

function parseStruct(node: xml_node): Struct {
  const memberNodes = getChildNodesByName(node, "member");
  const members = Object.fromEntries(memberNodes.map(parseStructMember)); // TODO: check duped?
  return new Struct(members);
}

function parseStructMember(node: xml_node): [string, Value] {
  const name = getRequiredString(node, "name");
  const valueNode = getRequiredChildNode(node, "value");
  const value = parseValueNode(valueNode);
  return [name, value];
}

function parseArray(node: xml_node) {
  const dataNode = getRequiredChildNode(node, "data");
  const valueNodes = getChildNodesByName(dataNode, "value");
  return new Array(valueNodes.map(parseValueNode));
}

function getRequiredChildNode(parent: xml_node, name: string): xml_node {
  const child = getChildNode(parent, name);
  if (child === undefined) {
    throw new Error("invalid");
  }
  return child;
}

function getChildNode(parent: xml_node, name: string): xml_node | undefined {
  const children = getChildNodesByName(parent, name);
  if (children.length === 0) {
    return undefined;
  } else if (children.length === 1) {
    return children[0];
  } else {
    throw new Error("invalid");
  }
}

function getChildNodesByName(parent: xml_node, name: string): xml_node[] {
  return getChildNodes(parent).filter((child) => child["~name"] === name);
}

function getChildNodes(parent: xml_node): xml_node[] {
  return parent["~children"].flatMap((child) =>
    "~children" in child ? [child] : []
  );
}

function getRequiredString(parent: xml_node, name: string): string {
  const child = parent[name];
  if (typeof child === "string") {
    return child;
  }
  throw new Error("invalid");
}

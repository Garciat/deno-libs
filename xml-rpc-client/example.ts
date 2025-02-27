import { fetchFor } from "../http/mod.ts";

import { fromValue, methodCall } from "./json.ts";
import { XmlRpcClient } from "./mod.ts";

const conn = await Deno.connect({
  transport: "unix",
  path: "./supervisord.sock",
});

const handler = fetchFor(conn);

const client = new XmlRpcClient(new URL("http://localhost:9001/RPC2"), handler);

const response = await client.call(
  methodCall("supervisor.getAllProcessInfo"),
);
console.log(fromValue(response));

import { fetchFor } from "../http/mod.ts";
import { FaultError, XmlRpcClient } from "../xml-rpc-client/mod.ts";

import { bind } from "./mod.ts";

const conn = await Deno.connect({
  transport: "unix",
  path: "./supervisord.sock",
});

const handler = fetchFor(conn);

const client = new XmlRpcClient(new URL("http://localhost:9001/RPC2"), handler);

const methods = bind(client);

console.log(await methods.getState.call());

console.log(await methods.getProcessInfo.call("vscode-tunnel"));

console.log(await methods.getAllConfigInfo.call());

console.log(await methods.reloadConfig.call());

{
  const [pid, state] = await client.multicall(
    methods.getPID.build(),
    methods.getState.build(),
  );
  console.log(pid, state);
}

{
  try {
    await methods.getProcessInfo.call("does-not-exist");
  } catch (error) {
    if (error instanceof FaultError) {
      console.log(error.fault);
    }
  }
}

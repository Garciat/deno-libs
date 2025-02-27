# @garciat/libs

A random assortment of reusable Deno libraries.

## @garciat/libs/cgi

Provides a familiar interface for serving HTTP over CGI.

```typescript
import * as CGI from "@garciat/libs/cgi";

await CGI.serve((req) => new Response(`Hello ${req.url}`));
```

## @garciat/libs/http

Implements an HTTP client over any `Deno.Conn` object. For example, over Unix Domain Sockets.

```typescript
import { fetchFor } from "@garciat/libs/http";

const conn = await Deno.connect({
  transport: "unix",
  path: "./supervisord.sock",
});

const handler = fetchFor(conn);

const response: Response = await handler(new Request("http://localhost/"));

console.log(await response.text());
```

Also, contains a streaming HTTP/1.1 response parser in TypeScript.

## @garciat/libs/xml-rpc-client

A simple XML-RPC client implementation.

```typescript
import { XmlRpcClient, methodCall, fromValue } from "@garciat/libs/xml-rpc-client";

const client = new XmlRpcClient(new URL("http://localhost:9001/RPC2"), fetch);

const response = await client.call(
  methodCall("supervisor.getAllProcessInfo"),
);
console.log(fromValue(response));
```

It also provides a strongly-typed schema-based API builder.

```typescript
// skipping imports

const client = new XmlRpcClient(new URL("http://localhost:9001/RPC2"), fetch);

const ItemSchema = struct({
  title: string(),
  likes: i4(),
  createdAt: date(),
});

const getItems = client.bind(
  (clientId: number) => methodCall("service.getItems", clientId),
  array(ItemSchema),
);

const items = await getItems.call();

console.log(items); // [{title: "Hello", likes: 42, createdAt: Date(...)}, ...]
```

## @garciat/libs/supervisord-client

Uses the above XML-RPC client library to interface with [Supervisor](https://github.com/Supervisor/supervisor).

```typescript
// skipping imports

const conn = await Deno.connect({
  transport: "unix",
  path: "./supervisord.sock",
});

const handler = fetchFor(conn);

const client = new XmlRpcClient(new URL("http://localhost:9001/RPC2"), handler);

const methods = bind(client);

console.log(await methods.getState.call());
```

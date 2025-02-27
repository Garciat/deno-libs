import { assertEquals, assertRejects } from "@std/assert";

import { parseResponseFromStream } from "./response-parser.ts";

Deno.test("chunked response", async (t) => {
  await t.step("simple", async () => {
    const response = `HTTP/1.1 200 OK\r
Transfer-Encoding: chunked\r
\r
6\r
hello \r
6\r
world!\r
0\r
\r
`;

    assertEquals(await testChunkedResponse(response), "hello world!");
  });

  await t.step("empty", async () => {
    const response = `HTTP/1.1 200 OK\r
Transfer-Encoding: chunked\r
\r
0\r
\r
`;

    assertEquals(await testChunkedResponse(response), "");
  });

  await t.step("with extension", async () => {
    const response = `HTTP/1.1 200 OK\r
Transfer-Encoding: chunked\r
\r
6;foo=bar\r
hello \r
6;foo=bar\r
world!\r
0\r
\r
`;

    assertEquals(await testChunkedResponse(response), "hello world!");
  });

  await t.step("chunk size non-hex", async () => {
    const response = `HTTP/1.1 200 OK\r
Transfer-Encoding: chunked\r
\r
g\r
hello \r
0\r
\r
`;

    await assertRejects(
      async () => await testChunkedResponse(response),
      Error,
      "invalid chunk size",
    );
  });

  await t.step("chunk size too large", async () => {
    const response = `HTTP/1.1 200 OK\r
Transfer-Encoding: chunked\r
\r
ffffffffffffffffffffffffffffffff\r
hello \r
0\r
\r
`;

    await assertRejects(
      async () => await testChunkedResponse(response),
      Error,
      "invalid chunk size",
    );
  });

  await t.step("chunk size too small", async () => {
    const response = `HTTP/1.1 200 OK\r
Transfer-Encoding: chunked\r
\r
1\r
hello \r
0\r
\r
`;

    await assertRejects(
      async () => await testChunkedResponse(response),
      Error,
      "invalid chunked encoding",
    );
  });
});

async function testChunkedResponse(response: string) {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  setTimeout(async () => {
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(response));
    await writer.close();
  }, 0);
  const res = await parseResponseFromStream(readable);
  return await res.text();
}

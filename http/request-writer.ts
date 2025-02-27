// NOTE: does not close stream
export async function writeRequestToStream(
  req: Request,
  stream: WritableStream,
): Promise<void> {
  const writer = stream.getWriter();
  const encoder = new TextEncoder();

  const { method, url, headers, body } = req;
  const parsedUrl = new URL(url);
  const resource = parsedUrl.pathname + parsedUrl.search;

  await writer.write(
    encoder.encode(`${method.toUpperCase()} ${resource} HTTP/1.1\r\n`),
  );

  for (const [key, value] of headers.entries()) {
    await writer.write(encoder.encode(`${key}: ${value}\r\n`));
  }

  await writer.write(encoder.encode(`\r\n`));

  writer.releaseLock();

  if (body) {
    await body.pipeTo(stream, { preventClose: true });
  }
}

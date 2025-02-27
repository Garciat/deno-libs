import { parseResponseFromStream, writeRequestToStream } from "../http/mod.ts";

import { Handler } from "./http-utils.ts";

export function plainConnectionHTTPProxy(options: {
  basepath: string;
  connect: () => Promise<Deno.Conn>;
  postWriteAction?: (req: Request) => Promise<void>;
}): Handler {
  function makeProxyRequest(orig: Request) {
    const url = new URL(orig.url);

    if (!url.pathname.startsWith(options.basepath)) {
      throw new Error("unexpected pathname: " + url.pathname);
    }

    // Remove the basepath from the URL pathname.
    url.pathname = url.pathname.slice(options.basepath.length);

    const headers = new Headers(orig.headers);
    headers.set("Connection", "keep-alive");

    return new Request(url.toString(), {
      ...orig,
      headers,
    });
  }

  const connPromise = options.connect();
  connPromise.then((conn) => conn.unref());

  return async (req: Request) => {
    const conn = await connPromise;

    const proxyRequest = makeProxyRequest(req);

    await writeRequestToStream(proxyRequest, conn.writable);
    await options.postWriteAction?.(req);

    const response = await parseResponseFromStream(conn.readable);

    if (response.headers.has("Location")) {
      const url = new URL(response.headers.get("Location")!);
      url.pathname = options.basepath + url.pathname;
      response.headers.set("Location", url.toString());
    }

    return response;
  };
}

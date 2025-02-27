export type ServeHandlerInfo = {
  remoteAddr: string;
};

export type ServeHandler = (
  req: Request,
  info: ServeHandlerInfo,
  meta: MetaVariables,
) => Response | Promise<Response>;

/**
 * @see https://datatracker.ietf.org/doc/html/rfc3875#section-4.1
 */
export interface MetaVariables {
  "AUTH_TYPE": string | undefined;
  "CONTENT_LENGTH": string | undefined;
  "CONTENT_TYPE": string | undefined;
  "GATEWAY_INTERFACE": string;
  "PATH_INFO": string | undefined;
  "PATH_TRANSLATED": string | undefined;
  "QUERY_STRING": string;
  "REMOTE_ADDR": string;
  "REMOTE_HOST": string | undefined;
  "REMOTE_IDENT": string | undefined;
  "REMOTE_USER": string | undefined;
  "REQUEST_METHOD": string;
  "SCRIPT_NAME": string;
  "SERVER_NAME": string;
  "SERVER_PORT": string;
  "SERVER_PROTOCOL": string;
  "SERVER_SOFTWARE": string;
  // Non-standard:
  "REQUEST_URI": string;
  "REQUEST_SCHEME": string;

  /**
   * Environment variables that start with `HTTP_` are converted to headers.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc3875#section-4.1.18
   */
  headers: Headers;
}

export async function serve(
  handler: ServeHandler,
  options?: {
    input?: ReadableStream<Uint8Array>;
    output?: WritableStream<Uint8Array>;
    env?: Record<string, string | undefined>;
  },
): Promise<void> {
  const input = options?.input ?? Deno.stdin.readable;
  const output = options?.output ?? Deno.stdout.writable;
  const env = options?.env ?? Deno.env.toObject();
  try {
    const meta = readMetaVariables(env);
    const req = buildRequest(input, meta);
    const info = { remoteAddr: meta.REMOTE_ADDR };
    const res = await handler(req, info, meta);
    await writeReponse(output, res);
  } catch (e) {
    await writeReponse(output, newExceptionResponse(e));
  } finally {
    await output.close();
  }
}

export function buildRequest(
  input: ReadableStream<Uint8Array>,
  meta: MetaVariables,
): Request {
  const method = meta.REQUEST_METHOD;

  const scheme = meta.REQUEST_SCHEME;
  const host = meta.SERVER_NAME;
  const uri = meta.REQUEST_URI;

  const url = `${scheme}://${host}${uri}`;

  const headers = meta.headers;

  const body = method === "GET" || method === "HEAD" ? null : input;

  return new Request(url.toString(), {
    method,
    headers,
    body,
  });
}

export async function writeReponse(
  output: WritableStream<Uint8Array>,
  res: Response,
): Promise<void> {
  const enc = new TextEncoder();

  const writer = output.getWriter();
  try {
    await writer.write(
      enc.encode(`Status: ${res.status} ${res.statusText}\r\n`),
    );

    for (const [name, value] of res.headers.entries()) {
      await writer.write(enc.encode(`${name}: ${value}\r\n`));
    }

    await writer.write(enc.encode("\r\n"));
  } finally {
    writer.releaseLock();
  }

  if (res.body) {
    await res.body.pipeTo(output, { preventClose: true });
  }
}

export function readMetaVariables(
  env: Record<string, string | undefined>,
): MetaVariables {
  const headers = new Headers();

  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }
    if (name.startsWith("HTTP_")) {
      const headerName = name
        .slice("HTTP_".length)
        .replaceAll("_", "-")
        .toLowerCase();

      headers.set(headerName, value);
    }
  }

  return {
    "AUTH_TYPE": env["AUTH_TYPE"],
    "CONTENT_LENGTH": env["CONTENT_LENGTH"],
    "CONTENT_TYPE": env["CONTENT_TYPE"],
    "GATEWAY_INTERFACE": env["GATEWAY_INTERFACE"] ?? "",
    "PATH_INFO": env["PATH_INFO"],
    "PATH_TRANSLATED": env["PATH_TRANSLATED"],
    "QUERY_STRING": env["QUERY_STRING"] ?? "",
    "REMOTE_ADDR": env["REMOTE_ADDR"] ?? "",
    "REMOTE_HOST": env["REMOTE_HOST"],
    "REMOTE_IDENT": env["REMOTE_IDENT"],
    "REMOTE_USER": env["REMOTE_USER"],
    "REQUEST_METHOD": env["REQUEST_METHOD"] ?? "",
    "SCRIPT_NAME": env["SCRIPT_NAME"] ?? "",
    "SERVER_NAME": env["SERVER_NAME"] ?? "",
    "SERVER_PORT": env["SERVER_PORT"] ?? "",
    "SERVER_PROTOCOL": env["SERVER_PROTOCOL"] ?? "",
    "SERVER_SOFTWARE": env["SERVER_SOFTWARE"] ?? "",
    "REQUEST_URI": env["REQUEST_URI"] ?? "",
    "REQUEST_SCHEME": env["REQUEST_SCHEME"] ?? "",
    headers,
  };
}

function newExceptionResponse(err: unknown): Response {
  let message = `Uncaught Exception: \n\n`;
  for (let cur: unknown = err; cur;) {
    if (cur !== err) {
      message += "Caused by:\n";
    }
    if (cur instanceof Error) {
      message += `${cur.stack}\n\n`;
      cur = cur.cause;
    } else {
      message += `${cur}\n\n`;
    }
  }

  return new Response(message, {
    status: 500,
    statusText: "Internal Server Error",
    headers: {
      "content-type": "text/plain",
    },
  });
}

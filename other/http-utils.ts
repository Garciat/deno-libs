import { deleteCookie } from "@std/http/cookie";

import { VNode } from "preact";
import { render } from "preact-render-to-string";

export type Handler = (req: Request) => Response | Promise<Response>;

export type Middleware = (
  req: Request,
  next: () => Promise<Response>,
) => Response | Promise<Response>;

export function handleStatic(mime: string, contents: string): Handler {
  return () => newFileResponse(mime, contents);
}

abstract class HTTPError extends Error {
  abstract readonly status: number;
}

export class HTTPBadRequestError extends HTTPError {
  readonly status = 400;
}

export class HTTPUnauthorized extends HTTPError {
  readonly status = 401;
}

export function newExceptionResponse(e: unknown): Response {
  const status = e instanceof HTTPError ? e.status : 500;

  let message = `Uncaught Exception: \n\n`;
  for (let err: unknown = e; err;) {
    if (err !== e) {
      message += "Caused by:\n";
    }
    if (err instanceof Error) {
      message += `${err.stack}\n\n`;
      err = err.cause;
    } else {
      message += `${err}\n\n`;
    }
  }

  return newPlainTextResponse(message, status);
}

export function newPlainTextResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      "content-type": "text/plain",
    },
  });
}

export function newHTMLResponse(contents: string): Response {
  return new Response(`<!DOCTYPE html>\n${contents}`, {
    headers: {
      "content-type": "text/html",
    },
  });
}

export function newPreactResponse(doc: VNode): Response {
  return newHTMLResponse(render(doc));
}

export function newFileResponse(mime: string, contents: string): Response {
  return new Response(contents, {
    headers: {
      "content-type": mime,
    },
  });
}

export function newLogoutResponse(
  redirect: string,
  cookies: string[],
): Response {
  const headers = new Headers({
    "content-type": "text/html",
    "location": redirect,
  });
  for (const cookie of cookies) {
    deleteCookie(headers, cookie, {
      "secure": true,
    });
  }
  return new Response("", {
    status: 302,
    headers,
  });
}

/** @jsxImportSource npm:preact */

import { getCookies, setCookie } from "@std/http/cookie";

import { LoginTicket, OAuth2Client } from "google-auth-library";

import {
  HTTPUnauthorized,
  Middleware,
  newLogoutResponse,
  newPreactResponse,
} from "./http-utils.ts";
import { oakAdaptMiddleware } from "./oak-utils.ts";

export function googleAuthMiddleware(
  options: {
    baseURL: string;
    tokenCookieName: string;
    clientId: string;
    emailAllowlist: string[];
  },
): Middleware {
  const handleBadAuth = () => {
    return newLogoutResponse(options.baseURL, [options.tokenCookieName]);
  };

  const showAuthPage = () => {
    function main(callbackName: string) {
      Object.defineProperty(globalThis, callbackName, {
        value: async (token: { credential: string }) => {
          const response = await fetch("", {
            method: "POST",
            body: token.credential,
          });
          console.log(await response.text());
          if (response.ok) {
            globalThis.location.reload();
          } else {
            alert("Could not auth your user.");
          }
        },
      });
    }

    const callbackName = "handleToken";
    const source = `${main}; main("${callbackName}");`;

    const doc = (
      <html style="height:100%;display:flex;color-scheme:dark">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="flex-grow:1;display:flex;align-items:center;justify-content:center">
          <script src="https://accounts.google.com/gsi/client" async />
          <script dangerouslySetInnerHTML={{ __html: source }}></script>
          <style
            dangerouslySetInnerHTML={{
              __html: "iframe{color-scheme: normal;}",
            }}
          >
          </style>
          <div
            id="g_id_onload"
            data-client_id={options.clientId}
            data-use_fedcm_for_prompt="true"
            data-callback={callbackName}
          >
          </div>
          <div
            class="g_id_signin"
            data-type="standard"
            data-size="large"
            data-theme="filled_blue"
            data-text="signin"
            data-shape="pill"
            data-logo_alignment="left"
          >
          </div>
        </body>
      </html>
    );

    return newPreactResponse(doc);
  };

  const handleAuthSave = async (req: Request) => {
    const token = await req.text();

    const payload = await verifyAuth(token);

    if (payload === null) {
      return new Response("", { status: 401 });
    }

    const headers = new Headers();

    setCookie(headers, {
      name: options.tokenCookieName,
      value: token,
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
      maxAge: payload.exp - payload.iat,
    });

    return new Response("", {
      status: 201,
      headers,
    });
  };

  const verifyAuth = async (token: string) => {
    const client = new OAuth2Client();

    let ticket: LoginTicket;

    try {
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: options.clientId,
      });
    } catch {
      return null;
    }

    const payload = ticket.getPayload();

    const email = payload?.email;
    if (!email) {
      return null;
    }

    if (!options.emailAllowlist.includes(email)) {
      return null;
    }

    return payload;
  };

  return async (req, next) => {
    const cookies = getCookies(req.headers);

    const token = cookies[options.tokenCookieName];

    if (!token) {
      switch (req.method) {
        case "GET":
          return showAuthPage();
        case "POST":
          return handleAuthSave(req);
        default:
          throw new HTTPUnauthorized("no auth");
      }
    }

    if (await verifyAuth(token)) {
      return await next();
    } else {
      return handleBadAuth();
    }
  };
}

export function googleAuthMiddlewareOak(
  ...args: Parameters<typeof googleAuthMiddleware>
) {
  return oakAdaptMiddleware(googleAuthMiddleware(...args));
}

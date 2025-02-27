import { Application, Context } from "@oak/oak";

import { Handler, Middleware, newExceptionResponse } from "./http-utils.ts";

export function oakAdaptMiddleware(middleware: Middleware) {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    return ctx.response.with(
      await middleware(ctx.request.source!, async () => {
        await next();
        return await ctx.response.toDomResponse();
      }),
    );
  };
}

export function oakAdaptHandler(handler: Handler) {
  return async (ctx: Context) =>
    ctx.response.with(await handler(ctx.request.source!));
}

export function oakAdaptApp(app: Application): Handler {
  return async (req: Request) =>
    await app.handle(req) ?? new Response("no response", { status: 500 });
}

export function scriptBaseURLRedirect(scriptName: string): Middleware {
  return async (req, next) => {
    const url = new URL(req.url);

    if (url.pathname === scriptName) {
      url.pathname += "/";
      return Response.redirect(url.toString(), 301);
    } else {
      return await next();
    }
  };
}

export function scriptBaseURLRedirectOak(
  ...args: Parameters<typeof scriptBaseURLRedirect>
) {
  return oakAdaptMiddleware(scriptBaseURLRedirect(...args));
}

export function uncaughtErrorPrinter() {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    try {
      await next();
    } catch (error) {
      if (ctx.response.writable) {
        ctx.response.with(newExceptionResponse(error));
      }
    }
  };
}

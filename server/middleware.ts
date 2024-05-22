import {
  AppLoadContext,
  ServerBuild,
  createRequestHandler,
} from "@remix-run/node";
import { createMiddleware } from "hono/factory";

import type { Context } from "hono";

export function cache(seconds: number) {
  return createMiddleware(async (c, next) => {
    if (!c.req.path.match(/\.[a-zA-z0-9]+$/) || c.req.path.endsWith(".data"))
      return next();

    await next();

    if (!c.res.ok) return;

    c.res.headers.set("Cache-Control", `public, max-age=${seconds}`);
  });
}

export type RemixMiddlewareOptions = {
  build: ServerBuild;
  mode?: "development" | "production";
  getLoadContext?: (c: Context) => Promise<AppLoadContext> | AppLoadContext;
};

export function remix({
  mode,
  build,
  getLoadContext = (c) => c.env as unknown as AppLoadContext,
}: RemixMiddlewareOptions) {
  return createMiddleware(async (c) => {
    const requestHandler = createRequestHandler(build, mode);
    const loadContext = getLoadContext(c);

    return await requestHandler(
      c.req.raw,
      loadContext instanceof Promise ? await loadContext : loadContext
    );
  });
}

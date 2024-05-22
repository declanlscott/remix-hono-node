import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { cache, remix } from "server/middleware";

import type { AppLoadContext, ServerBuild } from "@remix-run/node";

const mode =
  process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV;

const isProd = process.env.NODE_ENV === "production";

const viteDevServer = isProd
  ? undefined
  : await import("vite").then((vite) =>
      vite.createServer({ server: { middlewareMode: true }, appType: "custom" })
    );

const build = (isProd
  ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line import/no-unresolved -- this expected until you build the app
    await import("../build/server/remix.js")
  : await viteDevServer?.ssrLoadModule(
      "virtual:remix/server-build"
    )) as unknown as ServerBuild;

const server = new Hono();

server.use(
  "/assets/*",
  // Cache assets for 1 year
  cache(60 * 60 * 24 * 365),
  serveStatic({ root: "./build/client" })
);

server.use(
  "*",
  // Cache all other files for 1 hour
  cache(60 * 60),
  serveStatic({ root: isProd ? "./build/client" : "./public" })
);

server.use("*", logger());

server.use(async (c, next) =>
  remix({
    build,
    mode,
    getLoadContext: () =>
      ({
        appVersion: isProd ? build.assets.version : "dev",
      } satisfies AppLoadContext),
  })(c, next)
);

server.all("/api/*", (c) => fetch(c.req.url));

if (isProd)
  serve(
    {
      ...server,
      port: Number(process.env.PORT) || 3000,
    },
    async ({ address, port }) => {
      console.log(`Server listening on ${address}:${port}`);
    }
  );

export default server;

declare module "@remix-run/node" {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;
  }
}

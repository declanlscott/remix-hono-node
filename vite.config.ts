import devServer from "@hono/vite-dev-server";
import { vitePlugin } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { build } from "esbuild";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

export default defineConfig({
  server: {
    warmup: {
      clientFiles: [
        "./app/entry.client.tsx",
        "./app/entry.server.tsx",
        "./app/routes/**/*",
      ],
    },
  },
  optimizeDeps: {
    include: ["./app/routes/**/*"],
  },
  plugins: [
    devServer({
      injectClientScript: false,
      entry: "server/index.ts",
      exclude: [/^\/(app)\/.+/, /^\/@.+$/, /^\/node_modules\/.*/],
    }),
    tsconfigPaths(),
    vitePlugin({
      serverBuildFile: "remix.js",
      buildEnd: async () => {
        await build({
          alias: { "~": "./app" },
          outfile: "build/server/index.js",
          entryPoints: ["server/index.ts"],
          external: ["./build/server/*"],
          platform: "node",
          format: "esm",
          packages: "external",
          bundle: true,
          logLevel: "info",
        }).catch((e) => {
          console.error(e);
          process.exit(1);
        });
      },
    }),
  ],
});

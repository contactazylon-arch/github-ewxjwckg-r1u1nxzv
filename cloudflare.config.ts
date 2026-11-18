import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "botnexus-app",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-14",
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      VINEXT_KV_CACHE: bindings.kv({ id: "9f2ada965d204276b8300f7d8f81e961" }),
      AI: bindings.ai(),
      DISCORD_CLIENT_ID: bindings.text("1572384594118844547"),
      DISCORD_CLIENT_SECRET: bindings.secret(),
      DISCORD_REDIRECT_URI: bindings.text("https://botnexus-app.contact-azylon.workers.dev/api/auth/discord/callback"),
      BOTNEXUS_SESSION_KEY: bindings.secret(),
      BOTNEXUS_ADMIN_IDS: bindings.secret(),
    },
  }),
});

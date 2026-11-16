import { defineConfig } from "vite";
import vinext from "vinext";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { cloudflare } from "@cloudflare/vite-plugin";

const stackblitz = process.env.STACKBLITZ === "1";

export default defineConfig({
  plugins: stackblitz
    ? [vinext()]
    : [
        vinext({
          cache: {
            data: kvDataAdapter(),
          },
        }),
        cloudflare({
          viteEnvironment: {
            name: "rsc",
            childEnvironments: ["ssr"],
          },
        }),
      ],
});

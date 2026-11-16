import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

const stackblitz = process.env.STACKBLITZ === "1";

export default defineConfig({
  plugins: stackblitz
    ? [vinext()]
    : [
        vinext(),
        cloudflare({
          viteEnvironment: {
            name: "rsc",
            childEnvironments: ["ssr"],
          },
        }),
      ],
});

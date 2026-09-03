import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/dodgers-baseball/" : "/",
  server: {
    port: 5173,
    host: true,
  },
  build: {
    sourcemap: true,
    assetsInlineLimit: 0,
  },
});

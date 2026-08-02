import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  resolve: {
    alias: [
      {
        find: "@/scenes/BunkerV6Scene",
        replacement: fileURLToPath(
          new URL("./src/scenes/BunkerV7Scene.ts", import.meta.url),
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    emptyOutDir: true,
  },
}));

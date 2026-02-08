import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  // Electron loads the built app via file://, so production assets must be relative.
  // Keep dev server behavior unchanged.
  const base = command === "build" ? "./" : "/";
  return { base };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this at https://<username>.github.io/<repo-name>/,
// so the built app needs to know it's not living at the domain root.
// Replace "project-control-system" below with your actual repo name.
// Only applied for "npm run build" — local "npm run dev" still runs at "/".
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/project-control-system/" : "/",
}));

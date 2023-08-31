import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: new URL("index.html", import.meta.url).pathname,
        sandbox: new URL("sandbox.html", import.meta.url).pathname,
      },
    },
  },
});

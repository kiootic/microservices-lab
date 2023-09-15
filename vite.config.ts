import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { transformSync } from "esbuild";

const workerPath = new URL("src/sandbox/worker", import.meta.url).pathname;

const WorkerAsyncPlugin: Plugin = {
  name: "worker-async",
  transform(code, id) {
    const path = new URL(id, "file:///").pathname;
    if (!(path.startsWith(workerPath) && /\.(ts|js)$/.test(path))) {
      return;
    }

    const result = transformSync(code, {
      sourcemap: true,
      supported: {
        "async-await": false,
        "async-generator": false,
      },
    });
    return { code: result.code, map: result.map };
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), WorkerAsyncPlugin],
  worker: {
    plugins: [WorkerAsyncPlugin],
  },
  build: {
    rollupOptions: {
      input: {
        main: new URL("index.html", import.meta.url).pathname,
        sandbox: new URL("sandbox.html", import.meta.url).pathname,
      },
    },
  },
  optimizeDeps: {
    exclude: ["util"],
  },
});

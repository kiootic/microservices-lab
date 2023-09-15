import { initialize, context, Plugin, BuildContext } from "esbuild-wasm";
import ESBuildWasm from "esbuild-wasm/esbuild.wasm?url";

const wrapperJSPlaceholder = "###";
const wrapperJS = `
globalThis.$$module = function() {
  with (this.guard) {
    with (this.context) {
      (function() {
${wrapperJSPlaceholder}
      })();
    }
  }
};
`;

const init$ = initialize({ wasmURL: ESBuildWasm });

function basename(path: string) {
  return path.substring(path.lastIndexOf("/") + 1);
}

function extname(path: string) {
  const base = basename(path);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.substring(dot);
}

export async function makeBundle(
  modules: Map<string, string>,
  cancel$: Promise<void>,
): Promise<string> {
  await init$;

  const loader: Plugin = {
    name: "loader",
    setup(build) {
      function tryResolve(name: string): string | null {
        if (modules.has(name)) {
          return name;
        } else if (extname(name) === "") {
          if (modules.has(name + ".js")) {
            return name + ".js";
          } else if (modules.has(name + ".ts")) {
            return name + ".ts";
          }
        }
        return null;
      }

      build.onResolve({ filter: /.*/ }, async (args) => {
        const base = new URL(args.importer, "file://");
        const path = new URL(args.path, base).pathname;

        let resolved = tryResolve(path);
        if (resolved != null) {
          return { path: resolved };
        }

        if (extname(path) === "") {
          let index = path;
          if (!index.endsWith("/")) {
            index += "/";
          }
          index += "index";

          resolved = tryResolve(index);
          if (resolved != null) {
            return { path: resolved };
          }
        }
      });

      build.onLoad({ filter: /.*/ }, async (args) => {
        if (modules.has(args.path)) {
          return { contents: modules.get(args.path), loader: "ts" };
        }
      });
    },
  };

  let ctx: BuildContext | undefined;
  try {
    ctx = await context({
      entryPoints: ["/index.ts"],
      bundle: true,
      write: false,
      sourcemap: "inline",
      format: "cjs",
      target: "es2020",
      supported: {
        "async-await": false,
        "async-generator": false,
      },
      banner: {
        js: wrapperJS.slice(0, wrapperJS.indexOf(wrapperJSPlaceholder)),
      },
      footer: {
        js: wrapperJS.slice(
          wrapperJS.indexOf(wrapperJSPlaceholder) + wrapperJSPlaceholder.length,
        ),
      },
      plugins: [loader],
    });
    cancel$.then(() => ctx?.cancel());

    const result = await ctx.rebuild();
    return result.outputFiles?.[0].text ?? "";
  } finally {
    await ctx?.dispose();
  }
}

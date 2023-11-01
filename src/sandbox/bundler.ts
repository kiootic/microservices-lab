import {
  initialize,
  context,
  Plugin,
  BuildContext,
  Message,
} from "esbuild-wasm";
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

export class BuildError extends Error {
  readonly errors: Message[];
  constructor(message: string, errors: Message[]) {
    super(message);
    this.errors = errors;
  }
}

export async function initBundler() {
  await init$;
}

export async function makeBundle(
  modules: Map<string, string>,
  cancel$: Promise<void>,
): Promise<string> {
  try {
    await init$;

    const entryPoint = "/index.ts";
    if (!modules.has(entryPoint)) {
      modules = new Map(modules);
      modules.set(entryPoint, "");
    }

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

        build.onResolve({ filter: /.*/ }, (args) => {
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

        build.onLoad({ filter: /.*/ }, (args) => {
          if (modules.has(args.path)) {
            return { contents: modules.get(args.path), loader: "ts" };
          }
        });
      },
    };

    let ctx: BuildContext | undefined;
    try {
      ctx = await context({
        entryPoints: [entryPoint],
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
            wrapperJS.indexOf(wrapperJSPlaceholder) +
              wrapperJSPlaceholder.length,
          ),
        },
        plugins: [loader],
      });
      void cancel$.then(() => ctx?.cancel());

      const result = await ctx.rebuild();
      return result.outputFiles?.[0].text ?? "";
    } finally {
      await ctx?.dispose();
    }
  } catch (err) {
    if (err instanceof Error && "errors" in err && Array.isArray(err.errors)) {
      throw new BuildError("Build failed.", err.errors as Message[]);
    }
    throw err;
  }
}

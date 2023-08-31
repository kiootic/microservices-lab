import { rollup, Plugin } from "@rollup/browser";
import { transform } from "sucrase";

function basename(path: string) {
  return path.substring(path.lastIndexOf("/") + 1);
}

function extname(path: string) {
  const base = basename(path);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.substring(dot);
}

function loader(modules: Map<string, string>): Plugin {
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

  return {
    name: "loader",
    resolveId: (source, importer) => {
      source = new URL(source, "file://" + importer).pathname;
      let resolved = tryResolve(source);
      if (resolved != null) {
        return resolved;
      }

      if (extname(source) === "") {
        let index = source;
        if (!index.endsWith("/")) {
          index += "/";
        }
        index += "index";

        resolved = tryResolve(index);
        if (resolved != null) {
          return resolved;
        }
      }
    },
    load: (id) => modules.get(id),
  };
}

function sucrase(): Plugin {
  return {
    name: "sucrase",
    transform(code, id) {
      const result = transform(code, {
        transforms: ["typescript"],
        filePath: id,
        sourceMapOptions: { compiledFilename: id },
      });
      return {
        code: result.code,
        map: result.sourceMap,
      };
    },
  };
}

export async function makeBundle(
  modules: Map<string, string>,
): Promise<string> {
  const bundle = await rollup({
    input: "/",
    external: ["runtime"],
    plugins: [loader(modules), sucrase()],
  });

  const { output } = await bundle.generate({
    format: "cjs",
    sourcemap: "inline",
  });

  return output[0].code;
}

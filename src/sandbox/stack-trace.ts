import { parse } from "error-stack-parser-es";
import convert from "convert-source-map";
import { SourceMapConsumer, RawSourceMap } from "source-map-js";

const sourceMaps = new Map<string, SourceMapConsumer>();

async function loadSourceFile(
  fileName: string,
  sourceFiles: Map<string, string>,
) {
  const file = sourceFiles.get(fileName);
  if (file != null) {
    return file;
  }
  return await fetch(fileName).then((resp) => resp.text());
}

async function loadSourceMap(fileName: string, mapName: string) {
  const base64DataURLPrefix = "data:application/json;base64,";
  if (mapName.startsWith(base64DataURLPrefix)) {
    const encodedMapJSON = mapName.slice(base64DataURLPrefix.length);
    return atob(encodedMapJSON);
  }
  return fetch(new URL(mapName, fileName)).then((resp) => resp.text());
}

async function resolveSourceMap(
  fileName: string,
  sourceFiles: Map<string, string>,
) {
  if (!/^(blob|https?):/.test(fileName)) {
    return undefined;
  }

  const sourceFile = await loadSourceFile(fileName, sourceFiles);
  const converter = await convert.fromMapFileSource(
    sourceFile,
    async (mapName) => loadSourceMap(fileName, mapName),
  );
  if (converter == null) {
    return undefined;
  }

  return new SourceMapConsumer(converter.toObject() as RawSourceMap);
}

export async function resolveStackTrace(
  message: string,
  stack: string,
  sourceFiles: Map<string, string>,
): Promise<string> {
  try {
    const frames = parse({ name: "Error", message, stack });

    const mappedStack = [];
    for (const frame of frames) {
      let { functionName, fileName, lineNumber, columnNumber } = frame;
      if (fileName == null || lineNumber == null || columnNumber == null) {
        mappedStack.push(frame.source?.trim() ?? "");
        continue;
      }

      let sourceMap = sourceMaps.get(fileName);
      if (sourceMap == null) {
        sourceMap = await resolveSourceMap(fileName, sourceFiles);
        if (sourceMap != null) {
          sourceMaps.set(fileName, sourceMap);
        }
      }

      const srcPos = sourceMap?.originalPositionFor({
        line: lineNumber,
        column: columnNumber,
      });
      if (srcPos != null) {
        if (
          srcPos.source == null ||
          srcPos.line == null ||
          srcPos.column == null
        ) {
          continue;
        }
        functionName = srcPos.name ?? functionName;
        fileName = srcPos.source;
        lineNumber = srcPos.line;
        columnNumber = srcPos.column;
      }

      // Simplify runtime file path.
      const sandboxPath = "/src/sandbox/";
      if (fileName.includes(sandboxPath)) {
        fileName = fileName.slice(
          fileName.indexOf(sandboxPath) + sandboxPath.length,
        );
      }

      const position = [fileName, lineNumber, columnNumber].join(":");
      mappedStack.push(
        functionName ? `at ${functionName} (${position})` : `at ${position}`,
      );
    }

    return message + "\n" + mappedStack.map((s) => "  " + s).join("\n");
  } catch {
    return stack;
  }
}

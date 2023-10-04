import ts from "typescript";
import { Vfs, overlayVfs } from "./vfs";
import { libsVfs } from "./libs";

export function createLanguageService(
  vfs: Vfs,
  compilerOptions: unknown,
): ts.LanguageService {
  vfs = overlayVfs(vfs, libsVfs);

  const diagHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => "/",
    getCanonicalFileName: (fileName) => fileName,
    getNewLine: () => "\n",
  };

  const { options, errors } = ts.convertCompilerOptionsFromJson(
    compilerOptions,
    "/",
  );
  if (errors.length > 0) {
    throw new Error(ts.formatDiagnostics(errors, diagHost));
  }

  const defaultLibFileName = ts.getDefaultLibFileName(options);
  const host: ts.LanguageServiceHost = {
    getDefaultLibFileName: () =>
      "/node_modules/typescript/lib/" + defaultLibFileName,

    getCompilationSettings: () => options,
    getScriptFileNames: () =>
      vfs.fileNames().filter((f) => /\.(ts|js)$/.test(f)),
    getScriptSnapshot: (fileName) => {
      const contents = vfs.read(fileName);
      return contents != null
        ? ts.ScriptSnapshot.fromString(contents)
        : undefined;
    },
    getScriptVersion: (fileName) => {
      return String(vfs.getFileVersion(fileName));
    },

    getNewLine: () => "\n",
    useCaseSensitiveFileNames: () => true,
    getCurrentDirectory: () => "/",

    readDirectory: (path, extensions, _, include) => {
      let result = vfs.glob((include ?? ["**/*"]).map((p) => path + p));
      if (extensions != null) {
        result = result.filter((p) =>
          extensions.some((ext) => p.endsWith(ext)),
        );
      }
      return result;
    },
    getDirectories: (dir) => {
      const result = vfs
        .readDir(dir)
        .filter((f) => f.endsWith("/"))
        .map((f) => f.slice(0, f.length - 1));
      return result;
    },
    readFile: (fileName) => vfs.read(fileName),
    fileExists: vfs.exists,
  };

  const languageService = ts.createLanguageService(host);
  const diagnostics = languageService.getCompilerOptionsDiagnostics();

  if (diagnostics.length > 0) {
    throw new Error(ts.formatDiagnostics(diagnostics, diagHost));
  }

  return languageService;
}

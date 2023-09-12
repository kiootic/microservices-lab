import { createStore, StoreApi } from "zustand";
import { createLanguageService } from "../language/host";
import { mapStore, Store, storeVfs, Vfs } from "../language/vfs";
import ts from "typescript";

export function isValidFileName(fileName: string) {
  if (!fileName.startsWith("/")) {
    return false;
  }
  const segments = fileName.slice(1).split("/");
  return segments.every((s) => s !== "" && s !== "." && s !== "..");
}

function compareFileName(a: string, b: string) {
  const aSegments = a.split("/");
  const bSegments = b.split("/");
  if (aSegments.length !== bSegments.length) {
    return aSegments.length - bSegments.length;
  }
  for (let i = 0; i < aSegments.length; i++) {
    const cmp = aSegments[i].localeCompare(bSegments[i], undefined, {
      sensitivity: "base",
    });
    if (cmp !== 0) {
      return cmp;
    }
  }
  return 0;
}

export interface WorkspaceFile {
  vfs: Vfs;
  name: string;

  getFileVersion: () => number;
  read: () => string | undefined;
  write: (text: string) => void;

  getSyntacticDiagnostics: () => ts.DiagnosticWithLocation[];
  getSemanticDiagnostics: () => ts.Diagnostic[];
  getCompletionsAtPosition: (
    position: number,
    options: ts.GetCompletionsAtPositionOptions,
  ) => ts.CompletionInfo | undefined;
  getCompletionEntryDetails: (
    position: number,
    entryName: string,
  ) => ts.CompletionEntryDetails | undefined;
  getQuickInfoAtPosition: (position: number) => ts.QuickInfo | undefined;
  getSignatureHelpItems: (
    position: number,
    options: ts.SignatureHelpItemsOptions,
  ) => ts.SignatureHelpItems | undefined;
}

export interface WorkspaceValue {
  isDirty: boolean;
  fileNames: string[];
  vfs: Vfs;
  lang: ts.LanguageService;

  renameFile: (fileName: string, newFileName: string) => boolean;
  getFile: (fileName: string) => WorkspaceFile;
}
export type Workspace = StoreApi<WorkspaceValue>;

function wrapStore(inner: Store, workspace: Workspace): Store {
  return {
    fileNames: inner.fileNames,
    content: inner.content,
    subscribe: inner.subscribe,
    has: inner.has,
    get: inner.get,
    set: (fileName, text) => {
      const isNew = !inner.has(fileName);
      inner.set(fileName, text);

      if (isNew || !workspace.getState().isDirty) {
        workspace.setState((state) => ({
          isDirty: true,
          fileNames: isNew
            ? [...state.fileNames, fileName].sort(compareFileName)
            : state.fileNames,
        }));
      }
    },
    delete: (fileName) => {
      const isDeleted = inner.has(fileName);
      inner.delete(fileName);

      if (isDeleted || !workspace.getState().isDirty) {
        workspace.setState((state) => ({
          isDirty: true,
          fileNames: isDeleted
            ? state.fileNames.filter((f) => f !== fileName)
            : state.fileNames,
        }));
      }
    },
  };
}

const compilerOptions = {
  target: "ES2020",
  baseUrl: "/",
  module: "ES2020",
  moduleResolution: "bundler",
  isolatedModules: true,
  strict: true,
};

export function makeWorkspace() {
  return createStore<WorkspaceValue>()((set, get, workspace) => {
    const store = mapStore();
    const vfs = storeVfs(wrapStore(store, workspace));
    const lang = createLanguageService(vfs, compilerOptions);
    const fileCache = new Map<string, WorkspaceFile>();
    return {
      isDirty: false,
      fileNames: [],
      vfs,
      lang,

      renameFile: (fileName: string, newFileName: string) => {
        if (
          !vfs.exists(fileName) ||
          vfs.exists(newFileName) ||
          !isValidFileName(newFileName)
        ) {
          return false;
        }
        store.set(newFileName, store.get(fileName) ?? "");
        store.delete(fileName);

        let fileNames = get().fileNames.slice();
        fileNames = fileNames.map((n) => (n === fileName ? newFileName : n));
        fileNames.sort(compareFileName);
        set({ fileNames });
        return true;
      },

      getFile: (fileName) => {
        if (!vfs.exists(fileName)) {
          vfs.write(fileName, "");
        }

        let file = fileCache.get(fileName);
        if (file == null) {
          file = {
            name: fileName,
            vfs,

            getFileVersion: vfs.getFileVersion.bind(vfs, fileName),
            read: vfs.read.bind(vfs, fileName),
            write: vfs.write.bind(vfs, fileName),

            getSyntacticDiagnostics: lang.getSyntacticDiagnostics.bind(
              lang,
              fileName,
            ),
            getSemanticDiagnostics: lang.getSemanticDiagnostics.bind(
              lang,
              fileName,
            ),
            getCompletionsAtPosition: lang.getCompletionsAtPosition.bind(
              lang,
              fileName,
            ),
            getCompletionEntryDetails: (position, entryName) =>
              lang.getCompletionEntryDetails(
                fileName,
                position,
                entryName,
                undefined,
                undefined,
                undefined,
                undefined,
              ),
            getQuickInfoAtPosition: lang.getQuickInfoAtPosition.bind(
              lang,
              fileName,
            ),
            getSignatureHelpItems: lang.getSignatureHelpItems.bind(
              lang,
              fileName,
            ),
          };
          fileCache.set(fileName, file);
        }
        return file;
      },
    };
  });
}

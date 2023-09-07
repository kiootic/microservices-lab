import { createStore, StoreApi } from "zustand";
import { createLanguageService } from "../language/host";
import { mapStore, Store, storeVfs, Vfs } from "../language/vfs";
import ts from "typescript";

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
            ? [...state.fileNames, fileName].sort()
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
  moduleResolution: "bundler",
  isolatedModules: true,
  strict: true,
};

export function makeWorkspace() {
  return createStore<WorkspaceValue>()((_set, _get, workspace) => {
    const store = mapStore();
    const vfs = storeVfs(wrapStore(store, workspace));
    const lang = createLanguageService(vfs, compilerOptions);
    const fileCache = new Map<string, WorkspaceFile>();
    return {
      isDirty: false,
      fileNames: [],
      vfs,
      lang,
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
        }
        return file;
      },
    };
  });
}

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
  ) => ts.WithMetadata<ts.CompletionInfo> | undefined;
  getQuickInfoAtPosition: (position: number) => ts.QuickInfo | undefined;
  getSignatureHelpItems: (
    position: number,
    options: ts.SignatureHelpItemsOptions,
  ) => ts.SignatureHelpItems | undefined;
}

export interface Workspace {
  isDirty: boolean;
  fileNames: string[];
  vfs: Vfs;
  lang: ts.LanguageService;

  getFile: (fileName: string) => WorkspaceFile;
}

function wrapStore(inner: Store, workspace: StoreApi<Workspace>): Store {
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
  return createStore<Workspace>()((_set, _get, workspace) => {
    const store = mapStore();
    const vfs = storeVfs(wrapStore(store, workspace));
    const lang = createLanguageService(vfs, compilerOptions);
    return {
      isDirty: false,
      fileNames: [],
      vfs,
      lang,
      getFile: (fileName) => {
        if (!vfs.exists(fileName)) {
          vfs.write(fileName, "");
        }

        return {
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
          getQuickInfoAtPosition: lang.getQuickInfoAtPosition.bind(
            lang,
            fileName,
          ),
          getSignatureHelpItems: lang.getSignatureHelpItems.bind(
            lang,
            fileName,
          ),
        };
      },
    };
  });
}

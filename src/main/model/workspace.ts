import { createStore, StoreApi } from "zustand";
import { createLanguageService } from "../language/host";
import { mapStore, overlayVfs, Store, storeVfs, Vfs } from "../language/vfs";
import ts from "typescript";
import { runtimeLibsVfs } from "./runtime";

export function isValidFileName(fileName: string) {
  if (!fileName.startsWith("/")) {
    return false;
  }
  const segments = fileName.slice(1).split("/");
  return segments.every((s) => s !== "" && s !== "." && s !== "..");
}

function comparePathSegment(a: string, b: string, isFinal: boolean) {
  if (isFinal) {
    const aMD = a.toLowerCase().endsWith(".md");
    const bMD = b.toLowerCase().endsWith(".md");
    if (aMD !== bMD) {
      return aMD ? -1 : 1;
    }
  }
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareFileName(a: string, b: string) {
  const aSegments = a.split("/");
  const bSegments = b.split("/");
  if (aSegments.length !== bSegments.length) {
    return aSegments.length - bSegments.length;
  }
  for (let i = 0; i < aSegments.length; i++) {
    const cmp = comparePathSegment(
      aSegments[i],
      bSegments[i],
      i === aSegments.length - 1,
    );
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
  sessionID: string;

  isDirty: boolean;
  fileNames: string[];
  vfs: Vfs;
  lang: ts.LanguageService;

  getState(): WorkspaceState;

  renameFile: (fileName: string, newFileName: string) => boolean;
  getFile: (fileName: string) => WorkspaceFile;
}
export type Workspace = StoreApi<WorkspaceValue>;

export interface WorkspaceState {
  sessionID: string;
  files: ReadonlyMap<string, string>;
}

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
  moduleDetection: "force",
  isolatedModules: true,
  strict: true,
};

export function makeWorkspace(state?: WorkspaceState) {
  return createStore<WorkspaceValue>()((set, get, workspace) => {
    const { files: initialFiles = new Map<string, string>() } = state ?? {};
    const sessionID = crypto.randomUUID();

    const store = mapStore(initialFiles);
    const vfs = storeVfs(wrapStore(store, workspace));
    const lang = createLanguageService(
      overlayVfs(vfs, runtimeLibsVfs),
      compilerOptions,
    );
    const fileCache = new Map<string, WorkspaceFile>();

    return {
      sessionID,
      isDirty: false,
      fileNames: Array.from(initialFiles.keys()).sort(compareFileName),
      vfs,
      lang,

      getState: () => ({
        sessionID,
        files: store.content(),
      }),

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

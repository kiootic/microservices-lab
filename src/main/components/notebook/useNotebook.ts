import { useMemo, useState } from "react";
import { StoreApi, createStore, useStore } from "zustand";
import { Workspace, WorkspaceFile } from "../../model/workspace";

export interface NotebookUIStateValue {
  isOpened: (fileName: string) => boolean;
  toggleOpen: (fileName: string) => void;
}
export type NotebookUIState = StoreApi<NotebookUIStateValue>;

function createUIState(): NotebookUIState {
  interface NotebookUIStateInternalValue extends NotebookUIStateValue {
    isCollapsed: Partial<Record<string, boolean>>;
  }
  return createStore<NotebookUIStateInternalValue>((set, get) => ({
    isCollapsed: {},
    isOpened: (fileName) => !get().isCollapsed[fileName],
    toggleOpen: (fileName) =>
      set((s) => ({
        isCollapsed: { ...s.isCollapsed, [fileName]: !s.isCollapsed[fileName] },
      })),
  }));
}

export interface NotebookController {
  workspace: Workspace;
  files: WorkspaceFile[];
  uiState: NotebookUIState;
}

export function useNotebook(workspace: Workspace): NotebookController {
  const { fileNames, getFile } = useStore(workspace);

  const files = useMemo(() => fileNames.map(getFile), [fileNames, getFile]);
  const [uiState] = useState(() => createUIState());

  return useMemo(
    () => ({
      workspace,
      files,
      uiState,
    }),
    [workspace, files, uiState],
  );
}

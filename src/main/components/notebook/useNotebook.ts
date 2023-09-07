import { useMemo, useState } from "react";
import { StoreApi, createStore, useStore } from "zustand";
import { Workspace, WorkspaceFile } from "../../model/workspace";
import { EventBus, createEventBus } from "../../hooks/event-bus";

type NotebookUIEvent = { kind: "navigate"; fileName: string };

export interface NotebookUIStateValue {
  events: EventBus<NotebookUIEvent>;
  isOpened: (fileName: string) => boolean;
  visibleFileNames: Set<string>;
  toggleOpen: (fileName: string) => void;
  setIsVisible: (fileName: string, isVisible: boolean) => void;
}
export type NotebookUIState = StoreApi<NotebookUIStateValue>;

function createUIState(): NotebookUIState {
  interface NotebookUIStateInternalValue extends NotebookUIStateValue {
    isCollapsed: Partial<Record<string, boolean>>;
  }
  return createStore<NotebookUIStateInternalValue>((set, get) => ({
    events: createEventBus(),
    isCollapsed: {},
    visibleFileNames: new Set(),
    isOpened: (fileName) => !get().isCollapsed[fileName],
    toggleOpen: (fileName) =>
      set((s) => ({
        isCollapsed: { ...s.isCollapsed, [fileName]: !s.isCollapsed[fileName] },
      })),
    setIsVisible: (fileName, isVisible) =>
      set((s) => {
        const visibleFileNames = new Set(s.visibleFileNames);
        if (isVisible) {
          visibleFileNames.add(fileName);
        } else {
          visibleFileNames.delete(fileName);
        }
        return { visibleFileNames };
      }),
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

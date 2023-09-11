import React, { useMemo, useState } from "react";
import { StoreApi, createStore, useStore } from "zustand";
import { Workspace, WorkspaceFile } from "../../model/workspace";
import { EventBus, createEventBus } from "../../hooks/event-bus";

export type NotebookAction =
  | { kind: "add" }
  | { kind: "rename"; fileName: string }
  | { kind: "delete"; fileName: string };

export type NotebookUIEvent =
  | { kind: "show"; fileName: string }
  | { kind: "focus"; target: "nav"; fileName?: string }
  | { kind: "focus"; target: "editor"; fileName: string }
  | { kind: "focus"; target: "nav-toolbar" };

export interface NotebookUIStateValue {
  rootElementRef: React.RefObject<HTMLDivElement>;
  events: EventBus<NotebookUIEvent>;

  isOpened: (fileName: string) => boolean;
  toggleOpen: (fileName: string, force?: boolean) => boolean;

  visibleFileNames: Set<string>;
  setIsVisible: (fileName: string, isVisible: boolean) => void;

  activeAction: NotebookAction | null;
  startAction: (action: NotebookAction) => void;
  endAction: <K extends NotebookAction["kind"]>(
    kind: K,
  ) => (NotebookAction & { kind: K }) | null;
}
export type NotebookUIState = StoreApi<NotebookUIStateValue>;

function createUIState(): NotebookUIState {
  interface NotebookUIStateInternalValue extends NotebookUIStateValue {
    isCollapsed: Partial<Record<string, boolean>>;
  }
  return createStore<NotebookUIStateInternalValue>((set, get) => {
    const events = createEventBus<NotebookUIEvent>();

    return {
      rootElementRef: React.createRef(),
      events,

      isCollapsed: {},
      isOpened: (fileName) => !get().isCollapsed[fileName],
      toggleOpen: (fileName, force) => {
        set((s) => ({
          isCollapsed: {
            ...s.isCollapsed,
            [fileName]: force != null ? !force : !s.isCollapsed[fileName],
          },
        }));
        return !get().isCollapsed[fileName];
      },

      visibleFileNames: new Set(),
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

      activeAction: null,
      startAction: (action) => set({ activeAction: action }),
      endAction: <K extends NotebookAction["kind"]>(kind: K) => {
        const action = get().activeAction;
        if (action?.kind !== kind) {
          return null;
        }
        set({ activeAction: null });
        return action as NotebookAction & { kind: K };
      },
    };
  });
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

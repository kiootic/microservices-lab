import React, { useMemo, useState } from "react";
import { StoreApi, createStore } from "zustand";
import { EventBus, createEventBus } from "../../hooks/event-bus";
import { Workspace } from "../../model/workspace";

export type NotebookAction =
  | { kind: "add" }
  | { kind: "rename"; fileName: string }
  | { kind: "delete"; fileName: string };

export type NotebookUIEvent =
  | { kind: "show"; fileName: string }
  | { kind: "focus"; target: "nav"; fileName?: string }
  | { kind: "focus"; target: "editor"; fileName: string }
  | { kind: "focus"; target: "nav-toolbar" };

export interface NotebookUIState {
  isCollapsed: Partial<Record<string, boolean>>;
  editorState: Partial<Record<string, unknown>>;
  scrollY: number;
}

export interface NotebookController {
  workspace: Workspace;
  events: EventBus<NotebookUIEvent>;
  state: StoreApi<NotebookUIState>;
  setStatusBar?: (item: React.ReactNode) => void;
}

interface NotebookControllerParams {
  persistedState?: NotebookUIState;
  setStatusBar?: (item: React.ReactNode) => void;
}

export function useNotebook(
  workspace: Workspace,
  params?: NotebookControllerParams,
): NotebookController {
  const { persistedState, setStatusBar } = params ?? {};

  const [events] = useState(() => createEventBus<NotebookUIEvent>());
  const [state] = useState(() =>
    createStore<NotebookUIState>(
      () =>
        persistedState ?? {
          isCollapsed: {},
          editorState: {},
          scrollY: 0,
        },
    ),
  );

  return useMemo<NotebookController>(
    () => ({ workspace, events, state, setStatusBar }),
    [workspace, events, state, setStatusBar],
  );
}

import React, { useContext } from "react";
import { StoreApi } from "zustand";
import { EventBus } from "../../hooks/event-bus";
import { Workspace } from "../../model/workspace";
import {
  NotebookAction,
  NotebookUIEvent,
  NotebookUIState,
} from "./useNotebook";

export interface NotebookContextValue {
  workspace: Workspace;
  events: EventBus<NotebookUIEvent>;
  state: StoreApi<NotebookUIState>;

  rootElementRef: React.RefObject<HTMLDivElement>;

  toggleOpen: (fileName: string, force?: boolean) => boolean;

  setIsVisible: (fileName: string, isVisible: boolean) => void;

  startAction: (action: NotebookAction) => void;
  endAction: <K extends NotebookAction["kind"]>(
    kind: K,
  ) => (NotebookAction & { kind: K }) | null;
}

export const NotebookContext = React.createContext<NotebookContextValue | null>(
  null,
);

export function useNotebookContext(): NotebookContextValue {
  return useContext(NotebookContext)!;
}

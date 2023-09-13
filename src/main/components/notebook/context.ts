import React, { useContext } from "react";
import { StoreApi, createStore } from "zustand";
import { EventBus } from "../../hooks/event-bus";
import { Workspace } from "../../model/workspace";
import {
  NotebookAction,
  NotebookController,
  NotebookUIEvent,
  NotebookUIState,
} from "./useNotebook";

export interface NotebookInternalState {
  visibleFileNames: Set<string>;
  activeAction: NotebookAction | null;
}

export interface NotebookContextValue {
  workspace: Workspace;
  events: EventBus<NotebookUIEvent>;
  state: StoreApi<NotebookUIState>;
  internalState: StoreApi<NotebookInternalState>;

  rootElementRef: React.RefObject<HTMLDivElement>;

  setIsVisible: (fileName: string, isVisible: boolean) => void;

  toggleOpen: (fileName: string, force?: boolean) => boolean;

  startAction: (action: NotebookAction) => void;
  endAction: <K extends NotebookAction["kind"]>(
    kind: K,
  ) => (NotebookAction & { kind: K }) | null;
}

export function createContextValue(
  controller: NotebookController,
): NotebookContextValue {
  const internalState = createStore<NotebookInternalState>(() => ({
    visibleFileNames: new Set(),
    activeAction: null,
  }));

  return {
    ...controller,
    internalState,
    rootElementRef: React.createRef(),
    toggleOpen: (fileName, force) => {
      controller.state.setState((s) => ({
        isCollapsed: {
          ...s.isCollapsed,
          [fileName]: force != null ? !force : !s.isCollapsed[fileName],
        },
      }));
      return !controller.state.getState().isCollapsed[fileName];
    },

    setIsVisible: (fileName, isVisible) =>
      internalState.setState((s) => {
        const visibleFileNames = new Set(s.visibleFileNames);
        if (isVisible) {
          visibleFileNames.add(fileName);
        } else {
          visibleFileNames.delete(fileName);
        }
        return { visibleFileNames };
      }),

    startAction: (action) => internalState.setState({ activeAction: action }),
    endAction: <K extends NotebookAction["kind"]>(kind: K) => {
      const action = internalState.getState().activeAction;
      if (action?.kind !== kind) {
        return null;
      }
      internalState.setState({ activeAction: null });
      return action as NotebookAction & { kind: K };
    },
  };
}

export const NotebookContext = React.createContext<NotebookContextValue | null>(
  null,
);

export function useNotebookContext(): NotebookContextValue {
  return useContext(NotebookContext)!;
}

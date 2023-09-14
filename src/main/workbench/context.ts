import React, { useContext } from "react";
import { StoreApi, createStore } from "zustand";
import {
  WorkbenchController,
  WorkbenchPane,
  WorkbenchUIState,
  WorkbenchView,
  allWorkbenchPanes,
  allWorkbenchViews,
} from "./useWorkbench";

export type WorkbenchStatusBarItemKey = "notebook" | "experiment";

export interface WorkbenchInternalState {
  statusBarItems: Partial<Record<WorkbenchStatusBarItemKey, React.ReactNode>>;
}

export interface WorkbenchContextValue extends WorkbenchController {
  internalState: StoreApi<WorkbenchInternalState>;

  switchView: (pane: WorkbenchPane, view: WorkbenchView) => void;
  setStatusBarItem: (
    key: WorkbenchStatusBarItemKey,
    content: React.ReactNode,
  ) => void;
}

export function createContextValue(
  controller: WorkbenchController,
): WorkbenchContextValue {
  const internalState = createStore<WorkbenchInternalState>(() => ({
    statusBarItems: {},
  }));

  return {
    ...controller,
    internalState,

    switchView: (pane, view) => {
      const state = controller.state.getState();
      if (!allWorkbenchViews.includes(view)) {
        return;
      }

      const viewCurrentPane = findViewPane(state, view);
      if (viewCurrentPane === pane) {
        return;
      }

      let { paneView, viewAffinity, paneLastView } = state;
      paneLastView = { ...paneLastView, [pane]: paneView[pane] };
      paneView = { ...paneView, [pane]: view };
      viewAffinity = { ...viewAffinity, [view]: pane };

      if (viewCurrentPane != null) {
        let reassignedView = paneLastView[viewCurrentPane];
        if (reassignedView == null || reassignedView === view) {
          reassignedView = findUnboundView({ ...state, paneView })!;
        }

        paneLastView = { ...paneLastView, [viewCurrentPane]: view };
        paneView = { ...paneView, [viewCurrentPane]: reassignedView };
      }

      controller.state.setState({ paneView, viewAffinity, paneLastView });
    },
    setStatusBarItem: (key, content) => {
      internalState.setState((s) => ({
        statusBarItems: { ...s.statusBarItems, [key]: content },
      }));
    },
  };
}

export const WorkbenchContext =
  React.createContext<WorkbenchContextValue | null>(null);

export function useWorkbenchContext(): WorkbenchContextValue {
  return useContext(WorkbenchContext)!;
}

function findViewPane(
  state: WorkbenchUIState,
  view: WorkbenchView,
): WorkbenchPane | null {
  for (const pane of allWorkbenchPanes) {
    if (state.paneView[pane] === view) {
      return pane;
    }
  }
  return null;
}

function findUnboundView(state: WorkbenchUIState): WorkbenchView | null {
  const views = new Set(allWorkbenchViews);
  for (const pane of allWorkbenchPanes) {
    views.delete(state.paneView[pane]);
  }
  return views.size === 0 ? null : Array.from(views)[0];
}

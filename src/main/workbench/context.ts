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
import { internalLinkProtocol } from "../constants";

export type WorkbenchStatusBarItemKey = "notebook" | "experiment";

export interface WorkbenchInternalState {
  statusBarItems: Partial<Record<WorkbenchStatusBarItemKey, React.ReactNode>>;
  visiblePanes: WorkbenchPane[];
}

export interface WorkbenchContextValue extends WorkbenchController {
  internalState: StoreApi<WorkbenchInternalState>;

  switchView: (pane: WorkbenchPane, view: WorkbenchView) => void;
  showView: (view: WorkbenchView) => void;
  setStatusBarItem: (
    key: WorkbenchStatusBarItemKey,
    content: React.ReactNode,
  ) => void;
  tryHandleInternalLink: (link: string) => boolean;
}

export function createContextValue(
  controller: WorkbenchController,
): WorkbenchContextValue {
  const internalState = createStore<WorkbenchInternalState>(() => ({
    statusBarItems: {},
    visiblePanes: [],
  }));

  const switchView = (pane: WorkbenchPane, view: WorkbenchView) => {
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
  };

  return {
    ...controller,
    internalState,

    switchView,
    showView: (view) => {
      const state = controller.state.getState();
      const viewPane = findViewPane(state, view);
      const visiblePanes = internalState.getState().visiblePanes;
      if (viewPane != null && visiblePanes.includes(viewPane)) {
        return;
      }

      let targetPane = state.viewAffinity[view];
      if (targetPane == null || !visiblePanes.includes(targetPane)) {
        targetPane = visiblePanes.at(0) ?? "primary";
      }
      switchView(targetPane, view);
    },
    setStatusBarItem: (key, content) => {
      internalState.setState((s) => ({
        statusBarItems: { ...s.statusBarItems, [key]: content },
      }));
    },
    tryHandleInternalLink: (link) => {
      try {
        const url = new URL(link);
        if (url.protocol === internalLinkProtocol) {
          controller.events.dispatch({ kind: "link", url });
          return true;
        }
      } catch {
        return false;
      }
      return false;
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

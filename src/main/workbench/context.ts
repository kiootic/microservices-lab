import React, { useContext } from "react";
import { StoreApi } from "zustand";
import { EventBus } from "../hooks/event-bus";
import { Workspace } from "../model/workspace";
import {
  WorkbenchController,
  WorkbenchPane,
  WorkbenchUIEvent,
  WorkbenchUIState,
  WorkbenchView,
  allWorkbenchPanes,
  allWorkbenchViews,
} from "./useWorkbench";

export interface WorkbenchContextValue {
  workspace: Workspace;
  events: EventBus<WorkbenchUIEvent>;
  state: StoreApi<WorkbenchUIState>;

  switchView: (pane: WorkbenchPane, view: WorkbenchView) => void;
}

export function createContextValue(
  controller: WorkbenchController,
): WorkbenchContextValue {
  return {
    ...controller,

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

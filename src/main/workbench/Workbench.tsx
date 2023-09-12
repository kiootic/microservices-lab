import React, { useMemo } from "react";
import { WorkbenchContext, WorkbenchContextValue } from "./context";
import {
  WorkbenchController,
  WorkbenchPane,
  WorkbenchUIState,
  WorkbenchView,
} from "./useWorkbench";
import cn from "clsx";
import { Pane } from "./Pane";

interface WorkbenchProps {
  className?: string;
  controller: WorkbenchController;
}

export const Workbench: React.FC<WorkbenchProps> = (props) => {
  const { className, controller } = props;

  const context = useMemo<WorkbenchContextValue>(
    () => ({
      ...controller,

      switchView: (pane, view) => {
        const state = controller.state.getState();
        if (
          !state.enabledPanes.includes(pane) ||
          !state.enabledViews.includes(view)
        ) {
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
    }),
    [controller],
  );

  return (
    <WorkbenchContext.Provider value={context}>
      <div className={cn(className, "p-4 flex gap-x-4")}>
        <Pane className="flex-1" pane="primary" />
        <Pane className="flex-1" pane="secondary" />
      </div>
    </WorkbenchContext.Provider>
  );
};

function findViewPane(
  state: WorkbenchUIState,
  view: WorkbenchView,
): WorkbenchPane | null {
  for (const pane of state.enabledPanes) {
    if (state.paneView[pane] === view) {
      return pane;
    }
  }
  return null;
}

function findUnboundView(state: WorkbenchUIState): WorkbenchView | null {
  const views = new Set(state.enabledViews);
  for (const pane of state.enabledPanes) {
    views.delete(state.paneView[pane]);
  }
  return views.size === 0 ? null : Array.from(views)[0];
}

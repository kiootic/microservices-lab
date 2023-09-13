import { Allotment } from "allotment";
import cn from "clsx";
import React, { useMemo, useRef } from "react";
import { useSize } from "../hooks/resize";
import { Pane } from "./Pane";
import { WorkbenchContext, WorkbenchContextValue } from "./context";
import {
  WorkbenchController,
  WorkbenchPane,
  WorkbenchUIState,
  WorkbenchView,
  allWorkbenchPanes,
} from "./useWorkbench";

const compactLayoutThreshold = 768;

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
        if (!state.enabledViews.includes(view)) {
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

  const ref = useRef<HTMLDivElement>(null);
  const useCompactLayout = useSize(ref, (w) => w < compactLayoutThreshold);
  const enabledPanes = useMemo<WorkbenchPane[]>(
    () => (useCompactLayout ? ["primary"] : ["primary", "secondary"]),
    [useCompactLayout],
  );

  return (
    <WorkbenchContext.Provider value={context}>
      <div ref={ref} className={cn(className)}>
        {enabledPanes.length > 1 ? (
          <Allotment className="w-full h-full" minSize={320}>
            <Allotment.Pane>
              <Pane className="h-full" pane="primary" />
            </Allotment.Pane>
            <Allotment.Pane preferredSize="40%">
              <Pane className="h-full" pane="secondary" />
            </Allotment.Pane>
          </Allotment>
        ) : (
          <Pane className="w-full h-full" pane={enabledPanes[0]} />
        )}
      </div>
    </WorkbenchContext.Provider>
  );
};

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
  const views = new Set(state.enabledViews);
  for (const pane of allWorkbenchPanes) {
    views.delete(state.paneView[pane]);
  }
  return views.size === 0 ? null : Array.from(views)[0];
}

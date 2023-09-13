import { Allotment } from "allotment";
import cn from "clsx";
import React, { useMemo, useRef } from "react";
import { useSize } from "../hooks/resize";
import { Pane } from "./Pane";
import {
  WorkbenchContext,
  WorkbenchContextValue,
  createContextValue,
} from "./context";
import { WorkbenchController, WorkbenchPane } from "./useWorkbench";

const compactLayoutThreshold = 768;

interface WorkbenchProps {
  className?: string;
  controller: WorkbenchController;
}

export const Workbench: React.FC<WorkbenchProps> = (props) => {
  const { className, controller } = props;

  const context = useMemo<WorkbenchContextValue>(
    () => createContextValue(controller),
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

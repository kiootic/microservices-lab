import React, { useMemo, useState } from "react";
import { SplitLayout } from "../components/SplitLayout";
import { useSize } from "../hooks/resize";
import { Pane } from "./Pane";
import {
  WorkbenchContext,
  WorkbenchContextValue,
  createContextValue,
} from "./context";
import { WorkbenchController } from "./useWorkbench";

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

  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const useCompactLayout = useSize(element, (w) => w < compactLayoutThreshold);

  const paneA = useMemo<React.ReactNode>(
    () => <Pane className="w-full h-full" pane="primary" />,
    [],
  );
  const paneB = useMemo<React.ReactNode>(
    () =>
      useCompactLayout ? null : (
        <Pane className="w-full h-full" pane="secondary" />
      ),
    [useCompactLayout],
  );

  return (
    <WorkbenchContext.Provider value={context}>
      <div ref={setElement} className={className}>
        {paneA != null && paneB != null ? (
          <SplitLayout
            className="w-full h-full"
            minSize="320px"
            initialPaneASize="60%"
            paneA={paneA}
            paneB={paneB}
          />
        ) : (
          paneA ?? paneB ?? null
        )}
      </div>
    </WorkbenchContext.Provider>
  );
};

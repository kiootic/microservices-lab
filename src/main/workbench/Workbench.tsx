import React, { useMemo } from "react";
import { WorkbenchContext, WorkbenchContextValue } from "./context";
import { WorkbenchController } from "./useWorkbench";
import { NotebookView } from "./views/NotebookView";

interface WorkbenchProps {
  className?: string;
  controller: WorkbenchController;
}

export const Workbench: React.FC<WorkbenchProps> = (props) => {
  const { className, controller } = props;

  const context = useMemo<WorkbenchContextValue>(
    () => ({
      ...controller,
    }),
    [controller],
  );

  return (
    <WorkbenchContext.Provider value={context}>
      <NotebookView className={className} />
    </WorkbenchContext.Provider>
  );
};

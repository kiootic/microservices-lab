import React, { useMemo } from "react";
import { ExperimentController } from "./useExperiment";
import {
  ExperimentContext,
  ExperimentContextValue,
  createContextValue,
} from "./context";
import cn from "clsx";
import { ExperimentToolbar } from "./ExperimentToolbar";

interface ExperimentProps {
  className?: string;
  controller: ExperimentController;
}

export const Experiment: React.FC<ExperimentProps> = (props) => {
  const { className, controller } = props;

  const context = useMemo<ExperimentContextValue>(
    () => createContextValue(controller),
    [controller],
  );

  return (
    <ExperimentContext.Provider value={context}>
      <div className={cn("flex flex-col", className)}>
        <ExperimentToolbar className="flex-none" />
      </div>
    </ExperimentContext.Provider>
  );
};

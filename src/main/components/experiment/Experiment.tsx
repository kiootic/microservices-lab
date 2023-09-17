import React, { useMemo } from "react";
import { ExperimentController } from "./useExperiment";
import {
  ExperimentContext,
  ExperimentContextValue,
  createContextValue,
} from "./context";
import cn from "clsx";
import { ExperimentToolbar } from "./ExperimentToolbar";
import { LogBox } from "./LogBox";

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
        <div className="flex-1" />
        <hr className="border-t-2" />
        <LogBox className="flex-1 min-h-0" />
      </div>
    </ExperimentContext.Provider>
  );
};

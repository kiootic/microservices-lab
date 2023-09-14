import React, { useMemo } from "react";
import { ExperimentController } from "./useExperiment";
import {
  ExperimentContext,
  ExperimentContextValue,
  createContextValue,
} from "./context";

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
      <div className={className}></div>
    </ExperimentContext.Provider>
  );
};

import cn from "clsx";
import React, { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { ExperimentToolbar } from "./ExperimentToolbar";
import { LogBox } from "./LogBox";
import { MetricsBox } from "./MetricsBox";
import {
  ExperimentContext,
  ExperimentContextValue,
  createContextValue,
} from "./context";
import { ExperimentController } from "./useExperiment";

import styles from "./Experiment.module.css";

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

        <div className={cn(styles["section-header"])}>
          <FormattedMessage
            id="views.experiment.sections.metrics"
            defaultMessage="Metrics"
          />
        </div>
        <MetricsBox className="flex-1 min-h-0" />

        <hr className="border-t-2" />
        <div className={cn(styles["section-header"], "bg-gray-100")}>
          <FormattedMessage
            id="views.experiment.sections.logs"
            defaultMessage="Logs"
          />
        </div>
        <LogBox className="flex-1 min-h-0" />
      </div>
    </ExperimentContext.Provider>
  );
};

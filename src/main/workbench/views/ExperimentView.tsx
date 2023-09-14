import React, { useEffect } from "react";
import {
  ExperimentUIState,
  useExperiment,
} from "../../components/experiment/useExperiment";
import { useEventCallback } from "../../hooks/event-callback";
import { useWorkbenchContext } from "../context";
import { Experiment } from "../../components/experiment/Experiment";

interface ExperimentViewProps {
  className?: string;
}

export const ExperimentView: React.FC<ExperimentViewProps> = (props) => {
  const { className } = props;

  const { workspace, state, setStatusBarItem } = useWorkbenchContext();

  const setStatusBar = useEventCallback((item: React.ReactNode) => {
    setStatusBarItem("experiment", item);
  });
  useEffect(() => setStatusBar(null), [setStatusBar]);

  const experiment = useExperiment(workspace, {
    persistedState: (state.getState().notebookUIState ?? undefined) as
      | ExperimentUIState
      | undefined,
    setStatusBar,
  });

  const experimentUIState = experiment.state;
  useEffect(() => {
    return experimentUIState.subscribe((experimentUIState) => {
      state.setState({ experimentUIState });
    });
  }, [experimentUIState, state]);

  return <Experiment className={className} controller={experiment} />;
};

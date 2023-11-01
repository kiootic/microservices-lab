import React, { useEffect } from "react";
import { useStore } from "zustand";
import { Experiment } from "../../components/experiment/Experiment";
import {
  ExperimentUIState,
  useExperiment,
} from "../../components/experiment/useExperiment";
import { useEventCallback } from "../../hooks/event-callback";
import { useWorkbenchContext } from "../context";

interface ExperimentViewProps {
  className?: string;
}

export const ExperimentView: React.FC<ExperimentViewProps> = (props) => {
  const { className } = props;

  const { workspace, session, state, setStatusBarItem } = useWorkbenchContext();

  const setStatusBar = useEventCallback((item: React.ReactNode) => {
    setStatusBarItem("experiment", item);
  });
  useEffect(() => setStatusBar(null), [setStatusBar]);

  const experimentUIState = useStore(state, (s) => s.experimentUIState);
  const experiment = useExperiment(workspace, session, {
    persistedState: (state.getState().experimentUIState ?? undefined) as
      | ExperimentUIState
      | undefined,
    setStatusBar,
  });

  useEffect(() => {
    experiment.state.setState(() => experimentUIState as ExperimentUIState);
  }, [experiment.state, experimentUIState]);

  useEffect(() => {
    return experiment.state.subscribe((experimentUIState) => {
      state.setState({ experimentUIState });
    });
  }, [experiment.state, state]);

  return <Experiment className={className} controller={experiment} />;
};

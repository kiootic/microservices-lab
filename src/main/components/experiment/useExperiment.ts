import { useMemo, useState } from "react";
import { StoreApi, createStore } from "zustand";
import { EventBus, createEventBus } from "../../hooks/event-bus";
import { Workspace } from "../../model/workspace";
import { Session } from "../../model/session";

export type ExperimentUIEvent = never;

export interface ExperimentUIState {}

export interface ExperimentController {
  workspace: Workspace;
  session: Session;
  events: EventBus<ExperimentUIEvent>;
  state: StoreApi<ExperimentUIState>;

  setStatusBar?: (item: React.ReactNode) => void;
}

interface ExperimentControllerParams {
  persistedState?: ExperimentUIState;
  setStatusBar?: (item: React.ReactNode) => void;
}

export function useExperiment(
  workspace: Workspace,
  session: Session,
  params?: ExperimentControllerParams,
): ExperimentController {
  const { persistedState, setStatusBar } = params ?? {};

  const [events] = useState(() => createEventBus<ExperimentUIEvent>());
  const [state] = useState(() =>
    createStore<ExperimentUIState>(() => persistedState ?? {}),
  );

  return useMemo<ExperimentController>(
    () => ({ workspace, session, events, state, setStatusBar }),
    [workspace, session, events, state, setStatusBar],
  );
}

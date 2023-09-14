import React, { useContext } from "react";
import { StoreApi, createStore } from "zustand";
import { ExperimentController } from "./useExperiment";

export interface ExperimentInternalState {}

export interface ExperimentContextValue extends ExperimentController {
  internalState: StoreApi<ExperimentInternalState>;

  startSession: () => void;
  stopSession: () => void;
}

export function createContextValue(
  controller: ExperimentController,
): ExperimentContextValue {
  const internalState = createStore<ExperimentInternalState>(() => ({
    visibleFileNames: new Set(),
    activeAction: null,
  }));

  return {
    ...controller,
    internalState,

    startSession: () => {
      controller.session.start(controller.workspace.getState().vfs.content());
    },
    stopSession: () => {
      controller.session.cancel();
    },
  };
}

export const ExperimentContext =
  React.createContext<ExperimentContextValue | null>(null);

export function useExperimentContext(): ExperimentContextValue {
  return useContext(ExperimentContext)!;
}

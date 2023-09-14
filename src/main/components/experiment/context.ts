import React, { useContext } from "react";
import { StoreApi, createStore } from "zustand";
import { ExperimentController } from "./useExperiment";

export interface ExperimentInternalState {}

export interface ExperimentContextValue extends ExperimentController {
  internalState: StoreApi<ExperimentInternalState>;
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
  };
}

export const ExperimentContext =
  React.createContext<ExperimentContextValue | null>(null);

export function useExperimentContext(): ExperimentContextValue {
  return useContext(ExperimentContext)!;
}

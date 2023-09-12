import { useMemo, useState } from "react";
import { StoreApi, createStore } from "zustand";
import { EventBus, createEventBus } from "../hooks/event-bus";
import { Workspace } from "../model/workspace";

export type WorkbenchUIEvent = never;

export interface WorkbenchUIState {}

export interface WorkbenchController {
  workspace: Workspace;
  events: EventBus<WorkbenchUIEvent>;
  state: StoreApi<WorkbenchUIState>;
}

export function useWorkbench(workspace: Workspace): WorkbenchController {
  const [events] = useState(() => createEventBus<WorkbenchUIEvent>());
  const [state] = useState(() => createStore<WorkbenchUIState>(() => ({})));

  return useMemo<WorkbenchController>(
    () => ({ workspace, events, state }),
    [workspace, events, state],
  );
}

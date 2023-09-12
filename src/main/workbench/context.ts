import React, { useContext } from "react";
import { StoreApi } from "zustand";
import { EventBus } from "../hooks/event-bus";
import { Workspace } from "../model/workspace";
import {
  WorkbenchPane,
  WorkbenchUIEvent,
  WorkbenchUIState,
  WorkbenchView,
} from "./useWorkbench";

export interface WorkbenchContextValue {
  workspace: Workspace;
  events: EventBus<WorkbenchUIEvent>;
  state: StoreApi<WorkbenchUIState>;

  switchView: (pane: WorkbenchPane, view: WorkbenchView) => void;
}

export const WorkbenchContext =
  React.createContext<WorkbenchContextValue | null>(null);

export function useWorkbenchContext(): WorkbenchContextValue {
  return useContext(WorkbenchContext)!;
}

import { useMemo, useState } from "react";
import { StoreApi, createStore } from "zustand";
import { EventBus, createEventBus } from "../hooks/event-bus";
import { Workspace } from "../model/workspace";

export type WorkbenchUIEvent = never;

export type WorkbenchView = "notebook" | "experiment" | "journal";

export type WorkbenchPane = "primary" | "secondary";

export interface WorkbenchUIState {
  enabledPanes: WorkbenchPane[];
  enabledViews: WorkbenchView[];
  paneView: Record<WorkbenchPane, WorkbenchView>;
  paneLastView: Record<WorkbenchPane, WorkbenchView>;
  viewAffinity: Record<WorkbenchView, WorkbenchPane | null>;
}

export interface WorkbenchController {
  workspace: Workspace;
  events: EventBus<WorkbenchUIEvent>;
  state: StoreApi<WorkbenchUIState>;
}

export function useWorkbench(workspace: Workspace): WorkbenchController {
  const [events] = useState(() => createEventBus<WorkbenchUIEvent>());
  const [state] = useState(() =>
    createStore<WorkbenchUIState>(() => ({
      enabledPanes: ["primary", "secondary"],
      enabledViews: ["notebook", "experiment", "journal"],
      paneView: {
        primary: "notebook",
        secondary: "experiment",
      },
      paneLastView: {
        primary: "notebook",
        secondary: "experiment",
      },
      viewAffinity: {
        notebook: "primary",
        experiment: "secondary",
        journal: null,
      },
    })),
  );

  return useMemo<WorkbenchController>(
    () => ({ workspace, events, state }),
    [workspace, events, state],
  );
}

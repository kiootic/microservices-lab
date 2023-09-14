import { useMemo, useState } from "react";
import { StoreApi, createStore } from "zustand";
import { EventBus, createEventBus } from "../hooks/event-bus";
import { Workspace } from "../model/workspace";

export type WorkbenchUIEvent = never;

export type WorkbenchView = "notebook" | "experiment" | "journal";

export const allWorkbenchViews: readonly WorkbenchView[] = [
  "notebook",
  "experiment",
  "journal",
];

export type WorkbenchPane = "primary" | "secondary";

export const allWorkbenchPanes: readonly WorkbenchPane[] = [
  "primary",
  "secondary",
];

export interface WorkbenchUIState {
  paneView: Record<WorkbenchPane, WorkbenchView>;
  paneLastView: Record<WorkbenchPane, WorkbenchView>;
  viewAffinity: Record<WorkbenchView, WorkbenchPane | null>;

  notebookUIState: unknown;
  experimentUIState: unknown;
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
      notebookUIState: null,
      experimentUIState: null,
    })),
  );

  return useMemo<WorkbenchController>(
    () => ({ workspace, events, state }),
    [workspace, events, state],
  );
}

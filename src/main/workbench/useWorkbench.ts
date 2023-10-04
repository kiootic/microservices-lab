import { useMemo, useState } from "react";
import { StoreApi, createStore } from "zustand";
import { EventBus, createEventBus } from "../hooks/event-bus";
import { SessionController } from "../model/session";
import { Workspace } from "../model/workspace";
import { Journal, JournalEntryHandle } from "../model/journal";

export type WorkbenchUIEvent = {
  kind: "save";
  state: "saving" | "succeed" | "failed";
};

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
  session: SessionController;
  workspace: Workspace;
  journal: Journal;
  events: EventBus<WorkbenchUIEvent>;
  state: StoreApi<WorkbenchUIState>;

  loadJournal?: (handle: JournalEntryHandle) => void;
}

interface WorkbenchControllerParams {
  loadJournal?: (handle: JournalEntryHandle) => void;
}

export function useWorkbench(
  workspace: Workspace,
  journal: Journal,
  params?: WorkbenchControllerParams,
): WorkbenchController {
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

  const [session] = useState(() => new SessionController());

  return useMemo<WorkbenchController>(
    () => ({ workspace, journal, events, state, session, ...params }),
    [workspace, journal, events, state, session, params],
  );
}

import React, { useState } from "react";
import { JournalEntryHandle, makeJournal } from "../model/journal";
import { makeWorkspace } from "../model/workspace";
import { WorkbenchHost } from "./WorkbenchHost";
import { useEventCallback } from "../hooks/event-callback";
import { useStore } from "zustand";
import { Scenario } from "../model/scenarios";

export const MainScreen: React.FC = () => {
  const [journal] = useState(() => makeJournal());
  const [workspace, setWorkspace] = useState(() => makeWorkspace());
  const sessionID = useStore(workspace, (w) => w.sessionID);

  const loadJournal = useEventCallback((handle: JournalEntryHandle) => {
    const state = journal.getState().load(handle);
    const workspace = makeWorkspace(state);
    setWorkspace(workspace);
  });

  const loadScenario = useEventCallback((scenario: Scenario) => {
    const workspace = makeWorkspace({ sessionID: "", files: scenario.files });
    setWorkspace(workspace);
  });

  return (
    <WorkbenchHost
      key={sessionID}
      workspace={workspace}
      journal={journal}
      loadJournal={loadJournal}
      loadScenario={loadScenario}
    />
  );
};

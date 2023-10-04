import React, { useEffect, useState } from "react";
import { makeJournal } from "../model/journal";
import { makeWorkspace } from "../model/workspace";
import { Workbench } from "../workbench/Workbench";
import { useWorkbench } from "../workbench/useWorkbench";

export const WorkbenchHost: React.FC = () => {
  const [journal] = useState(() => makeJournal());

  const [workspace] = useState(() => {
    const workspace = makeWorkspace();
    workspace.getState().vfs.write("/index.ts", "console.log('Hello!');\n");
    return workspace;
  });

  const controller = useWorkbench(workspace, journal);

  useEffect(() => {
    let timeoutHandle: number | null = null;
    let completeHandle: number | null = null;

    const saveSession = () => {
      timeoutHandle = null;
      try {
        const state = workspace.getState().getState();
        journal.getState().saveSession(state);

        completeHandle = setTimeout(() => {
          completeHandle = null;
          controller.events.dispatch({ kind: "save", state: "succeed" });
        }, 300);
      } catch (e) {
        controller.events.dispatch({ kind: "save", state: "failed" });
        throw e;
      }
    };

    const handleWorkspaceOnChange = () => {
      if (timeoutHandle == null) {
        if (completeHandle != null) {
          clearTimeout(completeHandle);
        }
        controller.events.dispatch({ kind: "save", state: "saving" });
        timeoutHandle = setTimeout(saveSession, 500);
      }
    };

    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    queueMicrotask(() => {
      if (!disposed) {
        unsubscribe = workspace
          .getState()
          .vfs.subscribe(handleWorkspaceOnChange);
      }
    });

    return () => {
      disposed = true;
      unsubscribe?.();
      if (timeoutHandle != null) {
        clearTimeout(timeoutHandle);
        saveSession();
      }
    };
  }, [journal, workspace, controller.events]);

  return <Workbench className="w-full h-full" controller={controller} />;
};

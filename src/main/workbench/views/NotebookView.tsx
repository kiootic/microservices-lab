import React, { useEffect } from "react";
import { Notebook } from "../../components/notebook/Notebook";
import {
  NotebookUIState,
  useNotebook,
} from "../../components/notebook/useNotebook";
import { useWorkbenchContext } from "../context";
import { useEventCallback } from "../../hooks/event-callback";

interface NotebookViewProps {
  className?: string;
}

export const NotebookView: React.FC<NotebookViewProps> = (props) => {
  const { className } = props;

  const { workspace, state, setStatusBarItem } = useWorkbenchContext();

  const setStatusBar = useEventCallback((item: React.ReactNode) => {
    setStatusBarItem("notebook", item);
  });
  useEffect(() => setStatusBar(null), [setStatusBar]);

  const notebook = useNotebook(workspace, {
    persistedState: (state.getState().notebookUIState ?? undefined) as
      | NotebookUIState
      | undefined,
    setStatusBar,
  });

  const notebookUIState = notebook.state;
  useEffect(() => {
    return notebookUIState.subscribe((notebookUIState) => {
      state.setState({ notebookUIState });
    });
  }, [notebookUIState, state]);

  return <Notebook className={className} controller={notebook} />;
};

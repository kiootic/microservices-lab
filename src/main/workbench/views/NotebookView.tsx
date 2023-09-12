import React, { useEffect } from "react";
import { Notebook } from "../../components/notebook/Notebook";
import {
  NotebookUIState,
  useNotebook,
} from "../../components/notebook/useNotebook";
import { useWorkbenchContext } from "../context";

interface NotebookViewProps {
  className?: string;
}

export const NotebookView: React.FC<NotebookViewProps> = (props) => {
  const { className } = props;

  const { workspace, state } = useWorkbenchContext();
  const notebook = useNotebook(
    workspace,
    (state.getState().notebookUIState ?? undefined) as
      | NotebookUIState
      | undefined,
  );

  const notebookUIState = notebook.state;
  useEffect(() => {
    return notebookUIState.subscribe((notebookUIState) => {
      state.setState({ notebookUIState });
    });
  }, [notebookUIState, state]);

  return <Notebook className={className} controller={notebook} />;
};

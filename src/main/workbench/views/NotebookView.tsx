import React from "react";
import { Notebook } from "../../components/notebook/Notebook";
import { useNotebook } from "../../components/notebook/useNotebook";
import { useWorkbenchContext } from "../context";

interface NotebookViewProps {
  className?: string;
}

export const NotebookView: React.FC<NotebookViewProps> = (props) => {
  const { className } = props;

  const { workspace } = useWorkbenchContext();
  const notebook = useNotebook(workspace);

  return <Notebook className={className} controller={notebook} />;
};

import React from "react";
import cn from "clsx";
import { NotebookController } from "./useNotebook";
import { FileEditor } from "./FileEditor";
import styles from "./Notebook.module.css";

interface NotebookProps {
  className?: string;
  controller: NotebookController;
}

export const Notebook: React.FC<NotebookProps> = (props) => {
  const { className, controller } = props;

  const { files, uiState } = controller;

  return (
    <div
      className={cn(styles.notebook, "overflow-auto select-none", className)}
    >
      {files.map((file) => (
        <FileEditor key={file.name} file={file} uiState={uiState} />
      ))}
    </div>
  );
};

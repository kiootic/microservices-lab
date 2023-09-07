import React from "react";
import cn from "clsx";
import { NotebookController } from "./useNotebook";
import { FileView } from "./FileView";
import styles from "./Notebook.module.css";
import { SideNav } from "./SideNav";

interface NotebookProps {
  className?: string;
  controller: NotebookController;
}

export const Notebook: React.FC<NotebookProps> = (props) => {
  const { className, controller } = props;

  const { workspace, files, uiState } = controller;

  return (
    <div className={cn(styles.notebook, "flex select-none", className)}>
      <SideNav
        className="flex-none w-64 border-r-2"
        workspace={workspace}
        uiState={uiState}
      />
      <div className="flex-1 overflow-auto">
        {files.map((file) => (
          <FileView key={file.name} file={file} uiState={uiState} />
        ))}
      </div>
    </div>
  );
};

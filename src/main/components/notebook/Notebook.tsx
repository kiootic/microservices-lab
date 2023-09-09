import React from "react";
import cn from "clsx";
import { NotebookController } from "./useNotebook";
import { FileView } from "./FileView";
import styles from "./Notebook.module.css";
import { SideNav } from "./SideNav";
import { useStore } from "zustand";

interface NotebookProps {
  className?: string;
  controller: NotebookController;
}

export const Notebook: React.FC<NotebookProps> = (props) => {
  const { className, controller } = props;

  const { workspace, files, uiState } = controller;
  const ref = useStore(uiState, (s) => s.rootElementRef);

  return (
    <div ref={ref} className={cn("flex select-none", className)}>
      <SideNav
        className="flex-none w-64 border-r-2"
        workspace={workspace}
        uiState={uiState}
      />
      <div className={cn(styles["content"], "flex-1 overflow-auto")}>
        {files.map((file) => (
          <FileView key={file.name} file={file} uiState={uiState} />
        ))}
        <hr className="ml-12 flex-1 border-t-2 mt-5" />
      </div>
    </div>
  );
};

import React from "react";
import cn from "clsx";
import { useStore } from "zustand";
import { WorkspaceFile } from "../../model/workspace";
import { NotebookUIState } from "./useNotebook";

interface FileHeaderProps {
  className?: string;
  uiState: NotebookUIState;
  file: WorkspaceFile;
}

export const FileHeader: React.FC<FileHeaderProps> = (props) => {
  const { className, uiState, file } = props;

  const isOpened = useStore(uiState, (s) => s.isOpened(file.name));

  return (
    <div
      className={cn(
        "flex h-10 items-center text-sm hover:font-bold",
        className,
      )}
    >
      <span className="w-12 h-full flex items-center justify-center">
        <span
          className={cn(
            "codicon",
            isOpened ? "codicon-chevron-down" : "codicon-chevron-right",
          )}
        />
      </span>
      <div className="pl-2 pr-4">
        <span className="font-mono">{file.name}</span>
      </div>
      <hr className="flex-1 border-t-2" />
    </div>
  );
};

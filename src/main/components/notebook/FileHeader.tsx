import React, { useCallback } from "react";
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
  const toggleOpen = useStore(uiState, (s) => s.toggleOpen);

  const handleToggleOnClick = useCallback(() => {
    toggleOpen(file.name);
  }, [toggleOpen, file]);

  return (
    <div
      className={cn(
        "flex h-10 items-center text-sm text-gray-600 hover:font-bold",
        className,
      )}
    >
      <button
        type="button"
        className="w-12 h-full flex items-center justify-center"
        onClick={handleToggleOnClick}
      >
        <span
          className={cn(
            "codicon",
            isOpened ? "codicon-chevron-down" : "codicon-chevron-right",
          )}
        />
      </button>
      <div className="pl-2 pr-4">
        <span className="font-mono">{file.name}</span>
      </div>
      <hr className="flex-1 border-t-2" />
    </div>
  );
};

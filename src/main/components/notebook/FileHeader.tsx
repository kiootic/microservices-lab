import cn from "clsx";
import React from "react";
import { useStore } from "zustand";
import { useNotebookContext } from "./context";

interface FileHeaderProps {
  className?: string;
  fileName: string;
}

export const FileHeader: React.FC<FileHeaderProps> = (props) => {
  const { className, fileName } = props;

  const { state } = useNotebookContext();
  const isOpened = useStore(state, (s) => !s.isCollapsed[fileName]);

  return (
    <div
      className={cn(
        "flex h-10 items-center text-sm hover:font-bold",
        className,
      )}
    >
      <span className="flex-none w-12 h-full flex items-center justify-center">
        <span
          className={cn(
            "codicon",
            isOpened ? "codicon-chevron-down" : "codicon-chevron-right",
          )}
        />
      </span>
      <div className="truncate pl-2 pr-4">
        <span className="font-mono">{fileName}</span>
      </div>
      <hr className="w-8 flex-shrink-0 flex-grow border-t-2" />
    </div>
  );
};

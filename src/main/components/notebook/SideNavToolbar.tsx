import cn from "clsx";
import React from "react";
import { useStore } from "zustand";
import { useEventCallback } from "../../hooks/event-callback";
import { IconButton } from "../IconButton";
import { NotebookUIState } from "./useNotebook";

interface SideNavToolbarProps {
  className?: string;
  uiState: NotebookUIState;
}

export const SideNavToolbar: React.FC<SideNavToolbarProps> = (props) => {
  const { className, uiState } = props;

  const setIsAdding = useStore(uiState, (s) => s.setIsAdding);
  const handleAddOnCLick = useEventCallback(() => {
    setIsAdding(true);
  });

  return (
    <div className={cn("flex items-center justify-end p-1", className)}>
      <IconButton className="flex-none" onPress={handleAddOnCLick}>
        <span className="codicon codicon-add" />
      </IconButton>
    </div>
  );
};

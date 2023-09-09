import cn from "clsx";
import React from "react";
import { useStore } from "zustand";
import { useEventCallback } from "../../hooks/event-callback";
import { IconButton } from "../IconButton";
import { NotebookUIState } from "./useNotebook";
import { FocusScope, useFocusManager } from "react-aria";
import { useEvent } from "../../hooks/event-bus";

interface SideNavToolbarProps {
  className?: string;
  uiState: NotebookUIState;
}

export const SideNavToolbar: React.FC<SideNavToolbarProps> = (props) => {
  const { className, uiState } = props;

  const handleAddOnCLick = useEventCallback(() => {
    uiState.getState().startAction({ kind: "add" });
  });

  const events = useStore(uiState, (s) => s.events);
  const handleOnKeyDown = useEventCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      events.dispatch({ kind: "focus", target: "nav" });
    }
  });

  return (
    <div
      className={cn("flex items-center justify-end p-1", className)}
      onKeyDown={handleOnKeyDown}
    >
      <FocusScope>
        <ToolbarSentinel uiState={uiState} />
        <IconButton className="flex-none" onPress={handleAddOnCLick}>
          <span className="codicon codicon-add" />
        </IconButton>
      </FocusScope>
    </div>
  );
};

const ToolbarSentinel: React.FC<{ uiState: NotebookUIState }> = ({
  uiState,
}) => {
  const events = useStore(uiState, (s) => s.events);
  const manager = useFocusManager();
  useEvent(events, "focus", (e) => {
    if (e.kind === "focus" && e.target === "nav-toolbar") {
      manager.focusFirst();
    }
  });
  return null;
};

import cn from "clsx";
import React from "react";
import { FocusScope, useFocusManager } from "react-aria";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { IconButton } from "../IconButton";
import { useNotebookContext } from "./context";

interface SideNavToolbarProps {
  className?: string;
}

export const SideNavToolbar: React.FC<SideNavToolbarProps> = (props) => {
  const { className } = props;

  const { events, startAction } = useNotebookContext();

  const handleAddOnCLick = useEventCallback(() => {
    startAction({ kind: "add" });
  });

  const handleOnKeyDown = useEventCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      events.dispatch({ kind: "focus", target: "nav" });
    }
  });

  return (
    <div
      className={cn("flex items-center justify-end p-1", className)}
      onKeyDown={handleOnKeyDown}
    >
      <FocusScope>
        <ToolbarSentinel />
        <IconButton className="flex-none" onPress={handleAddOnCLick}>
          <span className="codicon codicon-add" />
        </IconButton>
      </FocusScope>
    </div>
  );
};

const ToolbarSentinel: React.FC = () => {
  const { events } = useNotebookContext();
  const manager = useFocusManager();
  useEvent(events, "focus", (e) => {
    if (e.kind === "focus" && e.target === "nav-toolbar") {
      manager.focusFirst();
    }
  });
  return null;
};

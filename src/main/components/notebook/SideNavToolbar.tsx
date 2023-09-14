import { createFocusManager } from "@react-aria/focus";
import React, { useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { Toolbar, ToolbarItem } from "../Toolbar";
import { useNavContext } from "../nav/context";
import { useNotebookContext } from "./context";

interface SideNavToolbarProps {
  className?: string;
}

export const SideNavToolbar: React.FC<SideNavToolbarProps> = (props) => {
  const { className } = props;

  const { events, startAction } = useNotebookContext();

  const ref = useRef<HTMLDivElement>(null);
  const focusManager = useMemo(() => createFocusManager(ref), []);

  const rightItems = useMemo<ToolbarItem[]>(
    () => [
      {
        key: "add",
        label: "Add",
        content: <span className="codicon codicon-add" />,
        action: () => startAction({ kind: "add" }),
      },
    ],
    [startAction],
  );

  const handleOnKeyDown = useEventCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      events.dispatch({ kind: "focus", target: "nav" });
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const { setIsNavOpened } = useNavContext();

  useEvent(events, "focus", (e) => {
    if (e.kind === "focus" && e.target === "nav-toolbar") {
      ReactDOM.flushSync(() => setIsNavOpened(true));
      focusManager.focusFirst();
    }
  });

  return (
    <div ref={ref} className={className} onKeyDownCapture={handleOnKeyDown}>
      <Toolbar className="w-full h-full" right={rightItems} />
    </div>
  );
};

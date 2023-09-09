import cn from "clsx";
import React, { useMemo, useRef } from "react";
import { Item, ListBox } from "react-aria-components";
import { useStore } from "zustand";
import { EventBus, useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { Workspace } from "../../model/workspace";
import { NotebookUIEvent, NotebookUIState } from "./useNotebook";

interface SideNavProps {
  className?: string;
  workspace: Workspace;
  uiState: NotebookUIState;
}

export const SideNav: React.FC<SideNavProps> = (props) => {
  const { className, workspace, uiState } = props;

  const fileNames = useStore(workspace, (w) => w.fileNames);
  const visibleFileNames = useStore(uiState, (s) => s.visibleFileNames);
  const activeFileName = fileNames.find((n) => visibleFileNames.has(n));

  const events = useStore(uiState, (s) => s.events);

  const onNavigate = useEventCallback((fileName: React.Key) => {
    events.dispatch({ kind: "navigate", fileName: String(fileName) });
  });

  return (
    <ListBox
      className={cn("overflow-auto font-mono text-sm py-2", className)}
      aria-label="Navigation"
      selectionMode="none"
      onAction={onNavigate}
    >
      {fileNames.map((fileName) => (
        <NavItem
          key={fileName}
          fileName={fileName}
          isActive={fileName === activeFileName}
          events={events}
        />
      ))}
    </ListBox>
  );
};

interface NavItemProps {
  className?: string;
  fileName: string;
  isActive: boolean;
  events: EventBus<NotebookUIEvent>;
}

export const NavItem: React.FC<NavItemProps> = (props) => {
  const { className, fileName, isActive, events } = props;

  const [dirname, basename] = useMemo(() => {
    const pathname = fileName.replace(/^\//, "");
    const lastSlash = pathname.lastIndexOf("/");
    if (lastSlash < 0) {
      return ["", pathname];
    }
    return [pathname.slice(0, lastSlash + 1), pathname.slice(lastSlash + 1)];
  }, [fileName]);

  const elementRef = useRef<HTMLDivElement>(null);
  useEvent(events, "focus", ({ target, fileName: targetFileName }) => {
    if (
      target === "nav" &&
      (targetFileName == null ? isActive : targetFileName === fileName)
    ) {
      elementRef.current?.focus();
    }
  });

  return (
    <Item
      ref={elementRef}
      className={cn(
        "px-2 py-1 truncate text-left cursor-pointer",
        "focus:outline-none focus-visible:ring-2",
        isActive
          ? "bg-gray-200"
          : "hover:bg-gray-100 focus-visible:bg-gray-100",
        className,
      )}
      id={fileName}
      textValue={fileName}
    >
      <span className="text-gray-500">{dirname}</span>
      <span className={isActive ? "font-bold text-gray-950" : "text-gray-500"}>
        {basename}
      </span>
    </Item>
  );
};

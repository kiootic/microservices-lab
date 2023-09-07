import React, { useCallback, useMemo } from "react";
import cn from "clsx";
import { Workspace } from "../../model/workspace";
import { useStore } from "zustand";
import { NotebookUIState } from "./useNotebook";

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
  const handleOnNavigate = useCallback(
    (fileName: string) => {
      events.dispatch({ kind: "navigate", fileName });
    },
    [events],
  );

  return (
    <ul className={cn("overflow-auto font-mono text-sm py-2", className)}>
      {fileNames.map((fileName) => (
        <li key={fileName}>
          <NavItem
            className="w-full"
            fileName={fileName}
            isActive={fileName === activeFileName}
            onNavigate={handleOnNavigate}
          />
        </li>
      ))}
    </ul>
  );
};

interface NavItemProps {
  className?: string;
  fileName: string;
  isActive: boolean;
  onNavigate: (fileName: string) => void;
}

export const NavItem: React.FC<NavItemProps> = (props) => {
  const { className, fileName, isActive, onNavigate } = props;

  const handleOnClick = useCallback(
    () => onNavigate(fileName),
    [onNavigate, fileName],
  );

  const [dirname, basename] = useMemo(() => {
    const pathname = fileName.replace(/^\//, "");
    const lastSlash = pathname.lastIndexOf("/");
    if (lastSlash < 0) {
      return ["", pathname];
    }
    return [pathname.slice(0, lastSlash + 1), pathname.slice(lastSlash + 1)];
  }, [fileName]);

  return (
    <button
      className={cn(
        "px-2 py-1 truncate text-left hover:bg-gray-200",
        className,
      )}
      onClick={handleOnClick}
    >
      <span className="text-gray-500">{dirname}</span>
      <span className={isActive ? "font-bold text-gray-950" : "text-gray-500"}>
        {basename}
      </span>
    </button>
  );
};

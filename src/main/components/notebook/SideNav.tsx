import cn from "clsx";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ListState, Selection } from "react-stately";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { Workspace } from "../../model/workspace";
import { AppButton } from "../AppButton";
import { AppDialog } from "../Dialog";
import { ListBox } from "../ListBox";
import { FileNameEntry } from "./FileNameEntry";
import { SideNavToolbar } from "./SideNavToolbar";
import { NotebookUIState } from "./useNotebook";

interface SideNavProps {
  className?: string;
  workspace: Workspace;
  uiState: NotebookUIState;
}

export const SideNav: React.FC<SideNavProps> = (props) => {
  const { className, workspace, uiState } = props;

  const events = useStore(uiState, (s) => s.events);

  const fileNames = useStore(workspace, (w) => w.fileNames);
  const visibleFileNames = useStore(uiState, (s) => s.visibleFileNames);
  const activeFileName = fileNames.find((n) => visibleFileNames.has(n));

  const action = useStore(uiState, (s) => s.activeAction);
  const fileEntryStyle = useMemo<React.CSSProperties>(() => {
    if (action?.kind === "add") {
      return {};
    }
    if (action?.kind === "rename") {
      return {
        position: "absolute",
        width: "100%",
        top: `${fileNames.indexOf(action.fileName) * 1.75}rem`,
      };
    }
    return {};
  }, [fileNames, action]);

  const stateRef = useRef<ListState<unknown>>(null);

  const selectedKeys = useMemo(
    () => (activeFileName == null ? [] : [activeFileName]),
    [activeFileName],
  );

  const handleListOnSelectionChange = useEventCallback(
    (selection: Selection) => {
      if (selection instanceof Set) {
        const fileName = String([...selection][0]);
        events.dispatch({ kind: "show", fileName });
      }
    },
  );

  const handleListOnAction = useEventCallback((fileName: React.Key) => {
    events.dispatch({
      kind: "focus",
      target: "editor",
      fileName: String(fileName),
    });
  });

  const handleListOnKeyDown = useEventCallback((e: React.KeyboardEvent) => {
    if (action != null) {
      return;
    }

    const state = stateRef.current;
    if (state == null) {
      return;
    }
    const focusedFileName = state.selectionManager.focusedKey
      ? String(state.selectionManager.focusedKey)
      : null;
    if (focusedFileName == null) {
      return;
    }

    switch (e.key) {
      case "ArrowUp": {
        if (focusedFileName === state.collection.getFirstKey()) {
          events.dispatch({ kind: "focus", target: "nav-toolbar" });
          e.stopPropagation();
          e.preventDefault();
        }
        break;
      }
      case "Escape": {
        events.dispatch({
          kind: "focus",
          target: "editor",
          fileName: focusedFileName,
        });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
      case " ": {
        uiState
          .getState()
          .startAction({ kind: "rename", fileName: focusedFileName });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
      case "Delete": {
        uiState
          .getState()
          .startAction({ kind: "delete", fileName: focusedFileName });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
    }
  });

  useEvent(events, "focus", (e) => {
    if (e.target === "nav") {
      const fileName = e.fileName ?? activeFileName;
      if (fileName != null) {
        stateRef.current?.selectionManager.setFocusedKey(fileName);
        stateRef.current?.selectionManager.setFocused(true);
      }
    }
  });

  return (
    <div className={cn("flex flex-col", className)}>
      <SideNavToolbar className="flex-none" uiState={uiState} />
      <div
        className="flex-1 overflow-auto font-mono text-sm py-2"
        onKeyDownCapture={handleListOnKeyDown}
      >
        <div className="relative">
          <ListBox
            aria-label="Navigation"
            onAction={handleListOnAction}
            selectedKeys={selectedKeys}
            onSelectionChange={handleListOnSelectionChange}
            selectionMode="single"
            selectionBehavior="replace"
            stateRef={stateRef}
          >
            {fileNames.map((fileName) => {
              const isActive = fileName === activeFileName;
              return (
                <ListBox.Item
                  key={fileName}
                  textValue={fileName}
                  className={cn(
                    isActive && "bg-primary-100",
                    "outline-none ring-inset ra-focus-visible:ring-1",
                    !isActive &&
                      "ra-hover:bg-gray-200 ra-focus-visible:bg-gray-100",
                    className,
                  )}
                >
                  <NavItem fileName={fileName} isActive={isActive} />
                </ListBox.Item>
              );
            })}
          </ListBox>

          {action?.kind === "add" ? (
            <FileNameEntry
              style={fileEntryStyle}
              workspace={workspace}
              uiState={uiState}
              currentFileName={null}
            />
          ) : null}

          {action?.kind === "rename" ? (
            <FileNameEntry
              key={action.fileName}
              style={fileEntryStyle}
              workspace={workspace}
              uiState={uiState}
              currentFileName={action.fileName}
            />
          ) : null}
        </div>
      </div>
      <DeleteDialog
        isDeleting={action?.kind === "delete"}
        fileName={action?.kind === "delete" ? action.fileName : null}
        workspace={workspace}
        uiState={uiState}
      />
    </div>
  );
};

interface NavItemProps {
  className?: string;
  fileName: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = (props) => {
  const { className, fileName, isActive } = props;

  const [dirname, basename] = useMemo(() => {
    const pathname = fileName.replace(/^\//, "");
    const lastSlash = pathname.lastIndexOf("/");
    if (lastSlash < 0) {
      return ["", pathname];
    }
    return [pathname.slice(0, lastSlash + 1), pathname.slice(lastSlash + 1)];
  }, [fileName]);

  return (
    <div
      className={cn(
        className,
        "px-2 py-1 truncate text-left cursor-pointer",
        !isActive && "text-gray-500",
      )}
    >
      <span>{dirname}</span>
      <span className={cn("text-gray-950", isActive && "font-bold")}>
        {basename}
      </span>
    </div>
  );
};

interface DeleteDialogProps {
  isDeleting: boolean;
  fileName: string | null;
  workspace: Workspace;
  uiState: NotebookUIState;
}

const DeleteDialog: React.FC<DeleteDialogProps> = (props) => {
  const { isDeleting, fileName, workspace, uiState } = props;

  const [displayFileName, setDisplayFileName] = useState(fileName);
  useLayoutEffect(() => {
    if (fileName != null) {
      setDisplayFileName(fileName);
    }
  }, [fileName]);

  const handleOnOpenChange = useEventCallback((isOpen: boolean) => {
    if (!isOpen) {
      uiState.getState().endAction("delete");
    }
  });
  const handleKeepOnClick = useEventCallback(() => {
    uiState.getState().endAction("delete");
  });

  const handleDeleteOnClick = useEventCallback(() => {
    const action = uiState.getState().endAction("delete");
    if (action != null) {
      workspace.getState().vfs.delete(action.fileName);
      uiState.getState().events.dispatch({ kind: "focus", target: "nav" });
    }
  });

  return (
    <AppDialog.ModalOverlay
      isOpen={isDeleting}
      isDismissable={true}
      onOpenChange={handleOnOpenChange}
    >
      <AppDialog.Modal>
        <AppDialog className="select-none">
          <AppDialog.Heading>Delete {displayFileName}</AppDialog.Heading>
          <AppDialog.Actions>
            <AppButton
              variant="destructive"
              className="flex-none"
              onPress={handleDeleteOnClick}
            >
              Delete
            </AppButton>
            <AppButton
              variant="secondary"
              className="flex-none"
              autoFocus
              onPress={handleKeepOnClick}
            >
              Keep
            </AppButton>
          </AppDialog.Actions>
        </AppDialog>
      </AppDialog.Modal>
    </AppDialog.ModalOverlay>
  );
};

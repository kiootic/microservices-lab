import cn from "clsx";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ListState } from "react-stately";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { AppButton } from "../AppButton";
import { AppDialog } from "../Dialog";
import { ListBox } from "../ListBox";
import { FileNameEntry } from "./FileNameEntry";
import { SideNavToolbar } from "./SideNavToolbar";
import { useNotebookContext } from "./context";
import { useNavContext } from "../nav/context";
import ReactDOM from "react-dom";

interface SideNavProps {
  className?: string;
}

export const SideNav: React.FC<SideNavProps> = (props) => {
  const { className } = props;

  const { workspace, events, internalState, startAction } =
    useNotebookContext();

  const fileNames = useStore(workspace, (w) => w.fileNames);
  const visibleFileNames = useStore(internalState, (s) => s.visibleFileNames);
  const activeFileName = useMemo(
    () => fileNames.find((n) => visibleFileNames.has(n)) ?? null,
    [fileNames, visibleFileNames],
  );

  const action = useStore(internalState, (s) => s.activeAction);
  const fileEntryStyle = useMemo<React.CSSProperties>(() => {
    if (action?.kind === "add") {
      return {};
    }
    if (action?.kind === "rename") {
      return {
        position: "absolute",
        width: "100%",
        top: `${fileNames.indexOf(action.fileName) * 2}rem`,
      };
    }
    return {};
  }, [fileNames, action]);

  const stateRef = useRef<ListState<unknown>>(null);

  const handleListOnAction = useEventCallback((key: React.Key) => {
    const fileName = String(key);
    events.dispatch({ kind: "show", fileName });
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
      case "Enter": {
        events.dispatch({
          kind: "focus",
          target: "editor",
          fileName: focusedFileName,
        });
        e.stopPropagation();
        e.preventDefault();
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
        startAction({ kind: "rename", fileName: focusedFileName });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
      case "Delete": {
        startAction({ kind: "delete", fileName: focusedFileName });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
    }
  });

  const { setIsNavOpened } = useNavContext();

  useEvent(events, "focus", (e) => {
    if (e.target === "nav") {
      ReactDOM.flushSync(() => setIsNavOpened(true));
      const fileName = e.fileName;
      if (fileName != null) {
        stateRef.current?.selectionManager.setFocusedKey(fileName);
      }
      stateRef.current?.selectionManager.setFocused(true);
    }
  });

  return (
    <div className={cn("flex flex-col", className)}>
      <SideNavToolbar className="flex-none" />
      <div
        className="flex-1 overflow-auto font-mono py-2"
        onKeyDownCapture={handleListOnKeyDown}
      >
        <div className="relative">
          <ListBox
            aria-label="Navigation"
            onAction={handleListOnAction}
            selectionMode="none"
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
                  )}
                >
                  <NavItem fileName={fileName} isActive={isActive} />
                </ListBox.Item>
              );
            })}
          </ListBox>

          {action?.kind === "add" ? (
            <FileNameEntry style={fileEntryStyle} currentFileName={null} />
          ) : null}

          {action?.kind === "rename" ? (
            <FileNameEntry
              key={action.fileName}
              style={fileEntryStyle}
              currentFileName={action.fileName}
            />
          ) : null}
        </div>
      </div>
      <DeleteDialog
        isDeleting={action?.kind === "delete"}
        fileName={action?.kind === "delete" ? action.fileName : null}
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

  const { events } = useNotebookContext();
  const handleOnDoubleClick = useEventCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    events.dispatch({ kind: "focus", target: "editor", fileName });
  });

  return (
    <div
      className={cn(
        className,
        "px-2 py-1 truncate text-left cursor-pointer",
        !isActive && "text-gray-500",
      )}
      onDoubleClick={handleOnDoubleClick}
    >
      <span>{dirname}</span>
      <span className={cn("text-primary-950", isActive && "font-semibold")}>
        {basename}
      </span>
    </div>
  );
};

interface DeleteDialogProps {
  isDeleting: boolean;
  fileName: string | null;
}

const DeleteDialog: React.FC<DeleteDialogProps> = (props) => {
  const { isDeleting, fileName } = props;

  const { workspace, events, endAction } = useNotebookContext();

  const [displayFileName, setDisplayFileName] = useState(fileName);
  useLayoutEffect(() => {
    if (fileName != null) {
      setDisplayFileName(fileName);
    }
  }, [fileName]);

  const handleOnOpenChange = useEventCallback((isOpen: boolean) => {
    if (!isOpen) {
      endAction("delete");
    }
  });
  const handleKeepOnClick = useEventCallback(() => {
    endAction("delete");
  });

  const handleDeleteOnClick = useEventCallback(() => {
    const action = endAction("delete");
    if (action != null) {
      workspace.getState().vfs.delete(action.fileName);
      events.dispatch({ kind: "focus", target: "nav" });
    }
  });

  return (
    <AppDialog.ModalOverlay
      isOpen={isDeleting}
      isDismissable={true}
      onOpenChange={handleOnOpenChange}
    >
      <AppDialog.Modal>
        <AppDialog>
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

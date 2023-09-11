import cn from "clsx";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { ListState, Selection } from "react-stately";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { Vfs } from "../../language/vfs";
import { Workspace, isValidFileName } from "../../model/workspace";
import { ListBox } from "../ListBox";
import { SideNavToolbar } from "./SideNavToolbar";
import { NotebookUIState } from "./useNotebook";

function validateNewFileName(vfs: Vfs, fileName: string) {
  if (!isValidFileName(fileName)) {
    return "Invalid file name";
  } else if (vfs.exists(fileName) || vfs.readDir(fileName).length > 0) {
    return "File already exists";
  }
  return null;
}

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
  const renameEntryOffsetStyle = useMemo(
    () => ({
      top:
        action?.kind === "rename"
          ? `${fileNames.indexOf(action.fileName) * 1.75}rem`
          : 0,
    }),
    [fileNames, action],
  );

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
        if (focusedFileName != null) {
          events.dispatch({
            kind: "focus",
            target: "editor",
            fileName: focusedFileName,
          });
          e.stopPropagation();
          e.preventDefault();
        }
        break;
      }
      case " ": {
        const fileName = String(
          state.selectionManager.focusedKey ?? activeFileName,
        );
        uiState.getState().startAction({ kind: "rename", fileName });
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
                  <NavItem
                    fileName={fileName}
                    isActive={isActive}
                    uiState={uiState}
                  />
                </ListBox.Item>
              );
            })}
          </ListBox>

          {action?.kind === "add" ? (
            <AddFileEntry workspace={workspace} uiState={uiState} />
          ) : null}

          {action?.kind === "rename" ? (
            <div className="absolute w-full" style={renameEntryOffsetStyle}>
              <RenameFileEntry
                key={action.fileName}
                fileName={action.fileName}
                workspace={workspace}
                uiState={uiState}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

interface NavItemProps {
  className?: string;
  fileName: string;
  isActive: boolean;
  uiState: NotebookUIState;
}

export const NavItem: React.FC<NavItemProps> = (props) => {
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

interface AddFileEntryProps {
  className?: string;
  workspace: Workspace;
  uiState: NotebookUIState;
}

const AddFileEntry: React.FC<AddFileEntryProps> = (props) => {
  const { className, workspace, uiState } = props;

  const validateFileName = useEventCallback((newFileName: string) => {
    const vfs = workspace.getState().vfs;
    return validateNewFileName(vfs, newFileName);
  });

  const handleOnFinishEdit = useEventCallback((newFileName: string | null) => {
    if (!uiState.getState().endAction("add")) {
      return;
    }

    if (newFileName != null) {
      ReactDOM.flushSync(() => {
        workspace.getState().createFile(newFileName, "//\n");
      });
      uiState
        .getState()
        .events.dispatch({ kind: "show", fileName: newFileName });
    } else {
      uiState.getState().events.dispatch({ kind: "focus", target: "nav" });
    }
  });

  return (
    <FileNameEditor
      className={className}
      initialFileName="/"
      validateFileName={validateFileName}
      onFinishEdit={handleOnFinishEdit}
    />
  );
};

interface RenameFileEntryProps {
  className?: string;
  fileName: string;
  workspace: Workspace;
  uiState: NotebookUIState;
}

const RenameFileEntry: React.FC<RenameFileEntryProps> = (props) => {
  const { className, fileName, workspace, uiState } = props;

  const validateFileName = useEventCallback((newFileName: string) => {
    const vfs = workspace.getState().vfs;
    return newFileName === fileName
      ? null
      : validateNewFileName(vfs, newFileName);
  });

  const handleOnFinishEdit = useEventCallback((newFileName: string | null) => {
    if (!uiState.getState().endAction("rename")) {
      return;
    }

    if (newFileName != null && newFileName !== fileName) {
      ReactDOM.flushSync(() => {
        workspace.getState().renameFile(fileName, newFileName);
      });
      uiState
        .getState()
        .events.dispatch({ kind: "show", fileName: newFileName });
    } else {
      uiState
        .getState()
        .events.dispatch({ kind: "focus", target: "nav", fileName });
    }
  });

  return (
    <FileNameEditor
      className={className}
      initialFileName={fileName}
      validateFileName={validateFileName}
      onFinishEdit={handleOnFinishEdit}
    />
  );
};

interface FileNameEditorProps {
  className?: string;
  initialFileName: string;
  validateFileName: (fileName: string) => string | null;
  onFinishEdit: (fileName: string | null) => void;
}

const FileNameEditor: React.FC<FileNameEditorProps> = (props) => {
  const { className, initialFileName, validateFileName, onFinishEdit } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState(() =>
    initialFileName.startsWith("/")
      ? initialFileName.slice(1)
      : initialFileName,
  );
  const handleOnChange = useEventCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileName = e.target.value;
      let error = "";
      if (fileName !== "") {
        error = validateFileName("/" + fileName) ?? "";
      }
      e.target.setCustomValidity(error);
      e.target.reportValidity();
      setFileName(e.target.value);
    },
  );
  const handleOnBlur = useEventCallback(() => {
    if (fileName !== "" && validateFileName("/" + fileName) == null) {
      onFinishEdit("/" + fileName);
    } else {
      onFinishEdit(null);
    }
  });
  const handleOnKeyDown = useEventCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onFinishEdit(null);
    }
  });
  const handleFormOnSubmit = useEventCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (fileName === "") {
      onFinishEdit(null);
    }
    const error = validateFileName("/" + fileName);
    if (error == null) {
      onFinishEdit("/" + fileName);
    } else if (inputRef.current != null) {
      inputRef.current.setCustomValidity(error);
      inputRef.current.reportValidity();
    }
  });

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input == null) {
      return;
    }

    input.focus();
    const text = input.value;
    const lastDot = text.lastIndexOf(".");
    const lastSlash = text.lastIndexOf("/");
    input.selectionStart = lastSlash + 1;
    input.selectionEnd = lastDot > lastSlash ? lastDot : text.length;
  }, []);

  return (
    <form className={className} onSubmit={handleFormOnSubmit}>
      <input
        ref={inputRef}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        className={cn(
          "block w-full px-2 py-1 bg-gray-100 invalid:bg-red-100",
          "outline-none ring-inset focus-visible:ring-1",
        )}
        value={fileName}
        onChange={handleOnChange}
        onKeyDown={handleOnKeyDown}
        onBlur={handleOnBlur}
      />
      <button type="submit" tabIndex={-1} className="sr-only">
        Confirm
      </button>
    </form>
  );
};

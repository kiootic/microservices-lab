import cn from "clsx";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Item, ListBox } from "react-aria-components";
import { useStore } from "zustand";
import { EventBus, useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { Workspace, isValidFileName } from "../../model/workspace";
import { SideNavToolbar } from "./SideNavToolbar";
import { NotebookUIEvent, NotebookUIState } from "./useNotebook";
import { Vfs } from "../../language/vfs";
import ReactDOM from "react-dom";

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

  const fileNames = useStore(workspace, (w) => w.fileNames);
  const visibleFileNames = useStore(uiState, (s) => s.visibleFileNames);
  const activeFileName = fileNames.find((n) => visibleFileNames.has(n));

  const vfs = useStore(workspace, (w) => w.vfs);
  const isAdding = useStore(uiState, (s) => s.isAdding);
  const setIsAdding = useStore(uiState, (s) => s.setIsAdding);
  const validateFileName = useEventCallback((fileName: string) =>
    validateNewFileName(vfs, fileName),
  );
  const handleAddFileOnFinishEdit = useEventCallback(
    (fileName: string | null) => {
      setIsAdding(false);
      if (fileName != null) {
        ReactDOM.flushSync(() => {
          workspace.getState().createFile(fileName, "//\n");
        });
        events.dispatch({ kind: "navigate", fileName });
      } else {
        events.dispatch({ kind: "focus", target: "nav" });
      }
    },
  );

  const events = useStore(uiState, (s) => s.events);

  const handleListOnAction = useEventCallback((fileName: React.Key) => {
    events.dispatch({ kind: "navigate", fileName: String(fileName) });
  });
  const handleListOnKeyDown = useEventCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      events.dispatch({ kind: "focus", target: "nav-toolbar" });
    }
  });

  return (
    <div className={cn("flex flex-col", className)}>
      <SideNavToolbar className="flex-none" uiState={uiState} />
      <div
        className="flex-1 overflow-auto font-mono text-sm py-2"
        onKeyDown={handleListOnKeyDown}
      >
        <ListBox aria-label="Navigation" onAction={handleListOnAction}>
          {fileNames.map((fileName) => (
            <NavItem
              key={fileName}
              fileName={fileName}
              isActive={fileName === activeFileName}
              events={events}
            />
          ))}
        </ListBox>
        {isAdding ? (
          <FileNameEditor
            initialFileName="/"
            validateFileName={validateFileName}
            onFinishEdit={handleAddFileOnFinishEdit}
          />
        ) : null}
      </div>
    </div>
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
  useEvent(events, "focus", (e) => {
    if (
      e.target === "nav" &&
      (e.fileName == null ? isActive : e.fileName === fileName)
    ) {
      elementRef.current?.focus();
    }
  });

  return (
    <Item
      ref={elementRef}
      className={cn(
        "px-2 py-1 truncate text-left cursor-pointer",
        "outline-none ring-inset ra-focus-visible:ring-1",
        isActive
          ? "bg-primary-100"
          : "ra-hover:bg-gray-200 ra-focus-visible:bg-gray-100 text-gray-500",
        className,
      )}
      id={fileName}
      textValue={fileName}
    >
      <span>{dirname}</span>
      <span className={cn("text-gray-950", isActive && "font-bold")}>
        {basename}
      </span>
    </Item>
  );
};

interface FileNameEditorProps {
  className?: string;
  initialFileName: string;
  validateFileName: (fileName: string) => string | null;
  onFinishEdit: (fileName: string | null) => void;
}

export const FileNameEditor: React.FC<FileNameEditorProps> = (props) => {
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

import React, { useRef, useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { useEventCallback } from "../../hooks/event-callback";
import { Workspace, isValidFileName } from "../../model/workspace";
import { NotebookUIState } from "./useNotebook";
import cn from "clsx";
import { Vfs } from "../../language/vfs";

function validateNewFileName(vfs: Vfs, fileName: string) {
  if (!isValidFileName(fileName)) {
    return "Invalid file name";
  } else if (vfs.exists(fileName) || vfs.readDir(fileName).length > 0) {
    return "File already exists";
  }
  return null;
}

interface FileNameEntryProps {
  className?: string;
  style?: React.CSSProperties;
  currentFileName: string | null;
  workspace: Workspace;
  uiState: NotebookUIState;
}

export const FileNameEntry: React.FC<FileNameEntryProps> = (props) => {
  const { className, style, currentFileName, workspace, uiState } = props;

  const validateFileName = useEventCallback((newFileName: string) => {
    const vfs = workspace.getState().vfs;
    if (currentFileName != null && currentFileName === newFileName) {
      return null;
    }
    return validateNewFileName(vfs, newFileName);
  });

  const handleOnFinishEdit = useEventCallback((newFileName: string | null) => {
    if (
      !uiState.getState().endAction(currentFileName == null ? "add" : "rename")
    ) {
      return;
    }

    const events = uiState.getState().events;
    if (newFileName != null) {
      ReactDOM.flushSync(() => {
        if (currentFileName != null) {
          workspace.getState().renameFile(currentFileName, newFileName);
        } else {
          workspace.getState().createFile(newFileName, "//\n");
        }
      });
      events.dispatch({ kind: "show", fileName: newFileName });
    } else {
      events.dispatch({ kind: "focus", target: "nav" });
    }
  });

  return (
    <FileNameEditor
      className={className}
      style={style}
      initialFileName={currentFileName ?? "/"}
      validateFileName={validateFileName}
      onFinishEdit={handleOnFinishEdit}
    />
  );
};

interface FileNameEditorProps {
  className?: string;
  style?: React.CSSProperties;
  initialFileName: string;
  validateFileName: (fileName: string) => string | null;
  onFinishEdit: (fileName: string | null) => void;
}

const FileNameEditor: React.FC<FileNameEditorProps> = (props) => {
  const { className, style, initialFileName, validateFileName, onFinishEdit } =
    props;

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
    <form className={className} style={style} onSubmit={handleFormOnSubmit}>
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

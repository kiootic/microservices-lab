import React, { useCallback } from "react";
import { useStore } from "zustand";
import { WorkspaceFile } from "../../model/workspace";
import { Editor } from "../editor/Editor";
import { FileHeader } from "./FileHeader";
import { NotebookUIState } from "./useNotebook";

interface FileEditorProps {
  className?: string;
  file: WorkspaceFile;
  uiState: NotebookUIState;
}

export const FileEditor: React.FC<FileEditorProps> = (props) => {
  const { className, file, uiState } = props;

  const isOpened = useStore(uiState, (s) => s.isOpened(file.name));

  const handleSummaryOnClick = useCallback<React.MouseEventHandler>(
    (e) => e.preventDefault(),
    [],
  );

  return (
    <div className={className}>
      <details open={isOpened}>
        <summary
          tabIndex={-1}
          className="marker:content-none"
          onClick={handleSummaryOnClick}
        >
          <FileHeader file={file} uiState={uiState} />
        </summary>
        <Editor file={file} />
      </details>
    </div>
  );
};

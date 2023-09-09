import { EditorView } from "@codemirror/view";
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { useIntersection } from "../../hooks/intersection";
import { WorkspaceFile } from "../../model/workspace";
import { WorkspaceFileEditor } from "../editor/WorkspaceFileEditor";
import { FileHeader } from "./FileHeader";
import { NotebookUIState } from "./useNotebook";

interface FileViewProps {
  className?: string;
  file: WorkspaceFile;
  uiState: NotebookUIState;
}

export const FileView: React.FC<FileViewProps> = (props) => {
  const { className, file, uiState } = props;

  const isOpened = useStore(uiState, (s) => s.isOpened(file.name));
  const toggleOpen = useStore(uiState, (s) => s.toggleOpen);
  const setIsVisible = useStore(uiState, (s) => s.setIsVisible);

  const handleSummaryOnClick = useEventCallback((e: React.MouseEvent) => {
    e.preventDefault();
    toggleOpen(file.name);
  });

  const contentElementRef = useRef<HTMLDetailsElement | null>(null);
  const isVisible = useIntersection(contentElementRef);
  useEffect(() => {
    setIsVisible(file.name, isVisible);
  }, [setIsVisible, file.name, isVisible]);

  const editorRef = useRef<EditorView | null>(null);

  const events = useStore(uiState, (s) => s.events);
  useEvent(events, "navigate", (e) => {
    if (e.fileName === file.name) {
      ReactDOM.flushSync(() => toggleOpen(file.name, true));
      contentElementRef.current?.scrollIntoView({ behavior: "smooth" });
      editorRef.current?.focus();
    }
  });

  return (
    <div className={className}>
      <details ref={contentElementRef} open={isOpened}>
        <summary
          className="marker:content-none cursor-pointer"
          onClick={handleSummaryOnClick}
        >
          <FileHeader file={file} uiState={uiState} />
        </summary>
        <WorkspaceFileEditor ref={editorRef} file={file} />
      </details>
    </div>
  );
};

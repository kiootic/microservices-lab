import React, { useCallback, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useIntersection } from "../../hooks/intersection";
import { WorkspaceFile } from "../../model/workspace";
import { Editor } from "../editor/Editor";
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

  const handleSummaryOnClick = useCallback<React.MouseEventHandler>(
    (e) => e.preventDefault(),
    [],
  );

  const contentElementRef = useRef<HTMLDetailsElement | null>(null);
  const isVisible = useIntersection(contentElementRef);
  useEffect(() => {
    setIsVisible(file.name, isVisible);
  }, [setIsVisible, file.name, isVisible]);

  const events = useStore(uiState, (s) => s.events);
  useEvent(events, "navigate", (e) => {
    if (e.fileName === file.name) {
      ReactDOM.flushSync(() => toggleOpen(file.name, true));
      contentElementRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  });

  return (
    <div className={className}>
      <details ref={contentElementRef} open={isOpened}>
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

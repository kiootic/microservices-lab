import { EditorView, keymap } from "@codemirror/view";
import React, { useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { useIntersection } from "../../hooks/intersection";
import { WorkspaceFile } from "../../model/workspace";
import { WorkspaceFileEditor } from "../editor/WorkspaceFileEditor";
import { FileHeader } from "./FileHeader";
import { NotebookUIState } from "./useNotebook";
import { Extension } from "@codemirror/state";
import { isIntersecting } from "../../utils/intersection";

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

  const contentElementRef = useRef<HTMLDetailsElement | null>(null);
  const isVisible = useIntersection(contentElementRef);
  useEffect(() => {
    setIsVisible(file.name, isVisible);
  }, [setIsVisible, file.name, isVisible]);

  const editorRef = useRef<EditorView | null>(null);

  const events = useStore(uiState, (s) => s.events);
  useEvent(events, "focus", (e) => {
    if (e.target === "editor" && e.fileName === file.name) {
      ReactDOM.flushSync(() => toggleOpen(file.name, true));
      editorRef.current?.focus();

      if (editorRef.current != null) {
        const view = editorRef.current;
        const pos = view.state.selection.main.from;
        const element = view.domAtPos(pos).node.parentElement;
        const rootElement = uiState.getState().rootElementRef.current;
        if (
          element != null &&
          rootElement != null &&
          !isIntersecting(element, rootElement)
        ) {
          element.scrollIntoView({ block: "center" });
        }
      }
    }
  });
  useEvent(events, "show", (e) => {
    if (e.fileName === file.name) {
      ReactDOM.flushSync(() => toggleOpen(file.name, true));

      contentElementRef.current?.scrollIntoView();
    }
  });

  const handleSummaryOnClick = useEventCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (ReactDOM.flushSync(() => toggleOpen(file.name))) {
      editorRef.current?.focus();
    } else {
      events.dispatch({ kind: "focus", target: "nav", fileName: file.name });
    }
  });

  const handleOnEscape = useEventCallback(() => {
    events.dispatch({ kind: "focus", target: "nav", fileName: file.name });
  });
  const extension: Extension = useMemo(
    () => [
      keymap.of([
        {
          key: "Escape",
          run: () => {
            handleOnEscape();
            return true;
          },
        },
      ]),
    ],
    [handleOnEscape],
  );

  return (
    <div className={className}>
      <details ref={contentElementRef} open={isOpened}>
        <summary
          className="marker:content-none cursor-pointer focus:outline-none"
          tabIndex={-1}
          onClick={handleSummaryOnClick}
        >
          <FileHeader file={file} uiState={uiState} />
        </summary>
        <WorkspaceFileEditor
          ref={editorRef}
          file={file}
          extension={extension}
        />
      </details>
    </div>
  );
};

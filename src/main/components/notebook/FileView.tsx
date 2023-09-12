import { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import React, { useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { useIntersection } from "../../hooks/intersection";
import { isIntersecting } from "../../utils/intersection";
import { WorkspaceFileEditor } from "../editor/WorkspaceFileEditor";
import { FileHeader } from "./FileHeader";
import cn from "clsx";
import { useNotebookContext } from "./context";

interface FileViewProps {
  className?: string;
  fileName: string;
}

export const FileView: React.FC<FileViewProps> = (props) => {
  const { className, fileName } = props;

  const { workspace, state, events, rootElementRef, toggleOpen, setIsVisible } =
    useNotebookContext();

  const file = useStore(workspace, (w) => w.getFile(fileName));

  const isOpened = useStore(state, (s) => !s.isCollapsed[fileName]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentsRef = useRef<HTMLDetailsElement | null>(null);
  const isVisible = useIntersection(containerRef);
  useEffect(() => {
    setIsVisible(fileName, isVisible);
  }, [setIsVisible, fileName, isVisible]);

  const editorRef = useRef<EditorView | null>(null);

  useEvent(events, "focus", (e) => {
    if (e.target === "editor" && e.fileName === fileName) {
      ReactDOM.flushSync(() => toggleOpen(fileName, true));
      editorRef.current?.focus();

      if (editorRef.current != null) {
        const view = editorRef.current;
        const pos = view.state.selection.main.from;
        const element = view.domAtPos(pos).node.parentElement;
        const rootElement = rootElementRef.current;
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
    if (e.fileName === fileName) {
      ReactDOM.flushSync(() => toggleOpen(fileName, true));

      contentsRef.current?.scrollIntoView();
    }
  });

  const handleSummaryOnClick = useEventCallback((e: React.MouseEvent) => {
    e.preventDefault();
  });

  const handleOnEscape = useEventCallback(() => {
    events.dispatch({ kind: "focus", target: "nav", fileName });
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

  const loadState = useEventCallback(() => {
    return state.getState().editorState[fileName];
  });
  const saveState = useEventCallback((editorState: unknown) => {
    state.setState((s) => ({
      editorState: { ...s.editorState, [fileName]: editorState },
    }));
  });

  return (
    <div className={cn("flow-root", className)}>
      <div ref={containerRef} className="flow-root mb-4">
        <details className="-mb-4" ref={contentsRef} open={isOpened}>
          <summary
            className="marker:content-none cursor-pointer outline-none"
            tabIndex={-1}
            onClickCapture={handleSummaryOnClick}
          >
            <FileHeader fileName={fileName} />
          </summary>
          <WorkspaceFileEditor
            ref={editorRef}
            file={file}
            extension={extension}
            loadState={loadState}
            saveState={saveState}
          />
        </details>
      </div>
    </div>
  );
};

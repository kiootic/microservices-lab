import { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useStore } from "zustand";
import { useEvent } from "../../hooks/event-bus";
import { useEventCallback } from "../../hooks/event-callback";
import { useIntersection } from "../../hooks/intersection";
import { isIntersecting } from "../../utils/intersection";
import { FileEditor } from "./FileEditor";
import { FileHeader } from "./FileHeader";
import cn from "clsx";
import { useNotebookContext } from "./context";
import { useNavContext } from "../nav/context";

import styles from "./FileView.module.css";
import { markdownLinkHandler } from "../editor/markdown";

interface FileViewProps {
  className?: string;
  fileName: string;
}

export const FileView: React.FC<FileViewProps> = (props) => {
  const { className, fileName } = props;

  const {
    workspace,
    state,
    events,
    rootElementRef,
    toggleOpen,
    setIsVisible,
    tryHandleInternalLink,
  } = useNotebookContext();

  const file = useStore(workspace, (w) => w.getFile(fileName));

  const isOpened = useStore(state, (s) => !s.isCollapsed[fileName]);

  const { setIsNavOpened } = useNavContext();

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const contentsRef = useRef<HTMLDetailsElement | null>(null);
  const isVisible = useIntersection(containerElement);
  useEffect(() => {
    setIsVisible(fileName, isVisible);
  }, [setIsVisible, fileName, isVisible]);

  const editorRef = useRef<EditorView | null>(null);

  useEvent(events, "focus", (e) => {
    if (e.target === "editor" && e.fileName === fileName) {
      ReactDOM.flushSync(() => {
        setIsNavOpened(false);
        toggleOpen(fileName, true);
      });
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
      ReactDOM.flushSync(() => {
        setIsNavOpened(false);
        toggleOpen(fileName, true);
      });

      contentsRef.current?.scrollIntoView();
    }
  });

  const handleSummaryOnClick = useEventCallback((e: React.MouseEvent) => {
    e.preventDefault();
  });

  const handleOnEscape = useEventCallback(() => {
    events.dispatch({ kind: "focus", target: "nav", fileName });
  });

  const handleMarkdownLink = useEventCallback((link: string) => {
    if (!tryHandleInternalLink?.(link)) {
      window.open(link, "_blank", "noreferrer");
    }
  });

  const extension: Extension = useMemo(
    () => [
      markdownLinkHandler.of(handleMarkdownLink),
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
    [handleOnEscape, handleMarkdownLink],
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
      <div ref={setContainerElement} className="flow-root mb-4">
        <details className="-mb-4" ref={contentsRef} open={isOpened}>
          <summary
            className={cn(styles["summary"], "cursor-pointer outline-none")}
            tabIndex={-1}
            onClickCapture={handleSummaryOnClick}
          >
            <FileHeader fileName={fileName} />
          </summary>
          <FileEditor
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

import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import cn from "clsx";
import React, { useCallback, useState } from "react";
import styles from "./Editor.module.css";
import { createEditorState } from "./state";

interface EditorProps {
  className?: string;
}

const setup: Extension = [
  EditorView.theme({
    ".cm-content, .cm-gutter": { minHeight: "var(--app-editor-min-height)" },
    ".cm-lineNumbers": { minWidth: "var(--app-editor-line-numbers-min-width)" },
  }),
];

export const Editor: React.FC<EditorProps> = (props) => {
  const { className } = props;

  const [view] = useState(
    () => new EditorView({ state: createEditorState(setup) }),
  );
  const setElement = useCallback(
    (el: HTMLElement | null) => {
      view.dom.remove();
      el?.append(view.dom);
    },
    [view],
  );

  return <div ref={setElement} className={cn(styles.editor, className)}></div>;
};

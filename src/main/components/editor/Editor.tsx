import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, highlightSpecialChars, keymap } from "@codemirror/view";
import React, { useLayoutEffect, useRef } from "react";
import { themeExtension } from "./theme";

const minimalSetup: Extension = [
  highlightSpecialChars(),
  history(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  themeExtension,
];

interface EditorProps {
  className?: string;
  initialText?: string;
  extension?: Extension;
}

export const Editor: React.FC<EditorProps> = (props) => {
  const { className, initialText, extension } = props;

  const element = useRef<HTMLDivElement>(null);
  const text = useRef(initialText);

  useLayoutEffect(() => {
    if (element.current == null) {
      return;
    }

    const state = EditorState.create({
      doc: text.current,
      extensions: [extension ?? [], minimalSetup],
    });
    const view = new EditorView({ parent: element.current, state });
    return () => view.destroy();
  }, [extension]);

  return <div ref={element} className={className}></div>;
};

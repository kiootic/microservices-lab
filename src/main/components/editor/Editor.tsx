import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, highlightSpecialChars, keymap } from "@codemirror/view";
import React, {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

export const Editor = React.forwardRef<EditorView | null, EditorProps>(
  (props, ref) => {
    const { className, initialText, extension } = props;

    const element = useRef<HTMLDivElement>(null);
    const initialTextRef = useRef(initialText);
    const viewRef = useRef<EditorView | null>(null);
    const [, render] = useState({});

    useImperativeHandle<EditorView | null, EditorView | null>(
      ref,
      () => viewRef.current,
    );

    useLayoutEffect(() => {
      if (element.current == null) {
        viewRef.current = null;
        return;
      }

      const state = EditorState.create({
        doc: viewRef.current?.state.doc ?? initialTextRef.current,
        extensions: [extension ?? [], minimalSetup],
      });
      const view = new EditorView({ parent: element.current, state });
      viewRef.current = view;
      render({});

      return () => {
        view.destroy();
      };
    }, [extension]);

    return <div ref={element} className={className}></div>;
  },
);

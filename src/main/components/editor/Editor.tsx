import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  EditorState,
  EditorStateConfig,
  Extension,
  StateField,
} from "@codemirror/state";
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

export interface InitialEditorState {
  fields: Record<string, StateField<unknown>>;
  json: unknown;
}

export interface EditorProps {
  className?: string;
  extension?: Extension;
  initialState?: InitialEditorState;
}

export const Editor = React.forwardRef<EditorView | null, EditorProps>(
  (props, ref) => {
    const { className, extension, initialState } = props;

    const element = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [, render] = useState({});

    useImperativeHandle<EditorView | null, EditorView | null>(
      ref,
      () => viewRef.current,
    );

    const initialStateRef = useRef(initialState);
    useLayoutEffect(() => {
      initialStateRef.current = initialState;
    }, [initialState]);

    useLayoutEffect(() => {
      if (element.current == null) {
        viewRef.current = null;
        return;
      }

      const initialState = initialStateRef.current;
      const config: EditorStateConfig = {
        doc: viewRef.current?.state.doc ?? "",
        extensions: [extension ?? [], minimalSetup],
      };
      const state =
        initialState == null
          ? EditorState.create(config)
          : EditorState.fromJSON(
              initialState.json,
              config,
              initialState.fields,
            );

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

import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  insertTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import {
  EditorView,
  KeyBinding,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import cn from "clsx";
import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { typescriptIntegration } from "../../language/typescript";
import { Workspace } from "../../workspace/workspace";
import styles from "./Editor.module.css";
import { prettier } from "./prettier";

const tabKeymap: KeyBinding[] = [
  {
    key: "Tab",
    preventDefault: true,
    run: insertTab,
  },
  {
    key: "Shift-Tab",
    preventDefault: true,
    run: indentLess,
  },
];

const setup: Extension = [
  lineNumbers(),
  highlightSpecialChars(),
  highlightActiveLineGutter(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  crosshairCursor(),
  prettier(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...tabKeymap,
  ]),
  EditorView.theme({
    ".cm-content, .cm-gutter": { minHeight: "var(--app-editor-min-height)" },
    ".cm-lineNumbers": { minWidth: "var(--app-editor-line-numbers-min-width)" },
  }),
];

function createEditorState(
  workspace: Workspace,
  fileName: string,
  text: string,
  ext: Extension,
) {
  return EditorState.create({
    doc: text,
    extensions: [setup, ext, typescriptIntegration(workspace, fileName)],
  });
}

function useEditorState(workspace: Workspace, fileName: string) {
  const stateRef = useRef<EditorState | null>(null);
  const versionRef = useRef<number | null>(null);

  return useSyncExternalStore(
    useCallback((onChange) => workspace.subscribe(onChange), [workspace]),
    useCallback(() => {
      const version = workspace.getFileVersion(fileName);
      if (stateRef.current != null && versionRef.current === version) {
        return stateRef.current;
      }

      const syncWorkspaceFile = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          workspace.write(fileName, update.state.doc.toString());
          versionRef.current = workspace.getFileVersion(fileName);
        }
      });

      const content = workspace.read(fileName);
      stateRef.current = createEditorState(
        workspace,
        fileName,
        content ?? "",
        syncWorkspaceFile,
      );
      versionRef.current = version;

      return stateRef.current;
    }, [workspace, fileName]),
  );
}

interface EditorProps {
  className?: string;
  workspace: Workspace;
  fileName: string;
}

export const Editor: React.FC<EditorProps> = (props) => {
  const { className, workspace, fileName } = props;

  const element = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);
  useLayoutEffect(() => {
    const view = new EditorView();
    setView(view);
    element.current?.append(view.dom);
    return () => view.destroy();
  }, []);

  const state = useEditorState(workspace, fileName);
  useLayoutEffect(() => {
    view?.setState(state);
  }, [view, state]);

  return <div ref={element} className={cn(styles.editor, className)}></div>;
};

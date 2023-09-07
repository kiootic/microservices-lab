import { EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import cn from "clsx";
import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { typescriptIntegration } from "../../editor/typescript";
import { WorkspaceFile } from "../../model/workspace";
import styles from "./Editor.module.css";
import { setup } from "./extensions";

function createEditorState(file: WorkspaceFile, ext: Extension) {
  return EditorState.create({
    doc: file.read() ?? "",
    extensions: [setup, ext, typescriptIntegration(file)],
  });
}

interface FileToken {
  file: WorkspaceFile;
  version: number;
}

function useEditor(element: React.RefObject<HTMLElement>, file: WorkspaceFile) {
  const tokenRef = useRef<FileToken | null>(null);
  const token = useSyncExternalStore(
    useCallback((onChange) => file.vfs.subscribe(onChange), [file]),
    useCallback(() => {
      const version = file.getFileVersion();
      if (
        tokenRef.current == null ||
        tokenRef.current.file !== file ||
        tokenRef.current.version !== version
      ) {
        tokenRef.current = { file, version };
      }
      return tokenRef.current;
    }, [file]),
  );

  useLayoutEffect(() => {
    if (element.current == null) {
      return;
    }

    const syncWorkspaceFile = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        token.file.write(update.state.doc.toString());
        token.version = token.file.getFileVersion();
      }
    });

    const state = createEditorState(token.file, syncWorkspaceFile);
    const view = new EditorView({ parent: element.current, state });
    return () => view.destroy();
  }, [element, token]);
}

interface EditorProps {
  className?: string;
  file: WorkspaceFile;
}

export const Editor: React.FC<EditorProps> = (props) => {
  const { className, file } = props;

  const element = useRef<HTMLDivElement>(null);
  useEditor(element, file);

  return <div ref={element} className={cn(styles.editor, className)}></div>;
};

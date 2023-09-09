import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import cn from "clsx";
import React, { useCallback, useRef, useSyncExternalStore } from "react";
import { typescriptIntegration } from "../../editor/typescript";
import { WorkspaceFile } from "../../model/workspace";
import { Editor } from "./Editor";
import { setup } from "./extensions";

interface WorkspaceFileEditorProps {
  className?: string;
  file: WorkspaceFile;
}

export const WorkspaceFileEditor: React.FC<WorkspaceFileEditorProps> = (
  props,
) => {
  const { className, file } = props;

  interface FileToken {
    file: WorkspaceFile;
    version: number;

    initialText: string;
    extension: Extension;
  }
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
        const token: FileToken = {
          file,
          version,
          initialText: file.read() ?? "",
          extension: [
            setup,
            typescriptIntegration(file),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                token.file.write(update.state.doc.toString());
                token.version = token.file.getFileVersion();
              }
            }),
            EditorView.theme({
              ".cm-content": {
                paddingTop: "0.5rem",
                paddingBottom: "2rem",
              },
              ".cm-line": {
                padding: "0 1rem",
              },
              ".cm-lineNumbers": {
                minWidth: "3rem",
              },
            }),
          ],
        };
        tokenRef.current = token;
      }
      return tokenRef.current;
    }, [file]),
  );

  return (
    <Editor
      className={cn("text-sm", className)}
      initialText={token.initialText}
      extension={token.extension}
    />
  );
};

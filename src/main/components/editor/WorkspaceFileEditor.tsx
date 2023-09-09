import { EditorView } from "@codemirror/view";
import cn from "clsx";
import React, {
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { typescriptIntegration } from "../../editor/typescript";
import { WorkspaceFile } from "../../model/workspace";
import { Editor } from "./Editor";
import { setup } from "./extensions";

interface WorkspaceFileEditorProps {
  className?: string;
  file: WorkspaceFile;
}

export const WorkspaceFileEditor = React.forwardRef<
  EditorView | null,
  WorkspaceFileEditorProps
>((props, ref) => {
  const { className, file } = props;

  interface FileToken {
    file: WorkspaceFile;
    version: number;
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
        };
        tokenRef.current = token;
      }
      return tokenRef.current;
    }, [file]),
  );

  const { initialText, extension } = useMemo(() => {
    return {
      initialText: token.file.read() ?? "",
      extension: [
        setup,
        typescriptIntegration(token.file),
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
  }, [token]);

  return (
    <Editor
      ref={ref}
      className={cn("text-sm", className)}
      initialText={initialText}
      extension={extension}
    />
  );
});

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
import { Extension } from "@codemirror/state";

interface WorkspaceFileEditorProps {
  className?: string;
  file: WorkspaceFile;
  extension?: Extension;
}

export const WorkspaceFileEditor = React.forwardRef<
  EditorView | null,
  WorkspaceFileEditorProps
>((props, ref) => {
  const { className, file, extension: extraExt } = props;

  interface FileToken {
    version: number;
    file: WorkspaceFile;
    fileVersion: number;
  }
  const tokenRef = useRef<FileToken | null>(null);
  const token = useSyncExternalStore(
    useCallback((onChange) => file.vfs.subscribe(onChange), [file]),
    useCallback(() => {
      const fileVersion = file.getFileVersion();
      if (
        tokenRef.current == null ||
        tokenRef.current.file !== file ||
        tokenRef.current.fileVersion !== fileVersion
      ) {
        const token: FileToken = {
          version: (tokenRef.current?.version ?? 0) + 1,
          file,
          fileVersion,
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
            token.fileVersion = token.file.getFileVersion();
          }
        }),
        EditorView.lineWrapping,
        EditorView.theme({
          ".cm-content": {
            paddingTop: "0.5rem",
            paddingBottom: "4rem",
          },
          ".cm-line": {
            padding: "0 1rem",
          },
          ".cm-lineNumbers": {
            minWidth: "3rem",
          },
        }),
        extraExt ?? [],
      ],
    };
  }, [token, extraExt]);

  return (
    <Editor
      key={token.version}
      ref={ref}
      className={cn("text-sm", className)}
      initialText={initialText}
      extension={extension}
    />
  );
});

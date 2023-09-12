import { historyField } from "@codemirror/commands";
import { foldState } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import cn from "clsx";
import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { typescriptIntegration } from "../../editor/typescript";
import { useForwardedRef } from "../../hooks/ref";
import { WorkspaceFile } from "../../model/workspace";
import { Editor, EditorProps, InitialEditorState } from "./Editor";
import { setup } from "./extensions";

interface WorkspaceFileEditorProps {
  className?: string;
  file: WorkspaceFile;
  extension?: Extension;
  loadState?: () => unknown;
  saveState?: (state: unknown) => void;
}

interface SavedState {
  fileVersion: number;
  json: unknown;
}

export const WorkspaceFileEditor = React.forwardRef<
  EditorView | null,
  WorkspaceFileEditorProps
>((props, forwardedRef) => {
  const { className, file, extension: extraExt, loadState, saveState } = props;
  const ref = useForwardedRef(forwardedRef);

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

  const [editorProps, setEditorProps] = useState<EditorProps | null>(null);

  useLayoutEffect(() => {
    const doc = token.file.read() ?? "";
    const initialState: InitialEditorState = {
      fields: {},
      json: EditorState.create({ doc }).toJSON(),
    };

    const loadedState = loadState?.() as SavedState | null | undefined;
    if (
      loadedState != null &&
      loadedState.fileVersion === token.file.getFileVersion()
    ) {
      initialState.fields = persistedFields;
      initialState.json = { ...(loadedState.json as object), doc };
    }

    setEditorProps({
      initialState,
      extension: [
        setup,
        typescriptIntegration(token.file),
        EditorView.updateListener.of((update) => {
          const state = update.state;
          if (update.docChanged) {
            token.file.write(state.doc.toString());
            token.fileVersion = token.file.getFileVersion();
          }

          const json = state.toJSON(persistedFields);
          delete json.doc;

          const savedState: SavedState = {
            fileVersion: token.fileVersion,
            json,
          };
          saveState?.(savedState);
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
    });
  }, [saveState, loadState, extraExt, token]);

  return editorProps != null ? (
    <Editor
      key={token.version}
      ref={ref}
      className={cn("text-sm", className)}
      {...editorProps}
    />
  ) : null;
});

const persistedFields = {
  history: historyField,
  fold: foldState,
};

import { historyField } from "@codemirror/commands";
import { foldState } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, tooltips } from "@codemirror/view";
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
import { Editor, EditorProps, InitialEditorState } from "../editor/Editor";
import { setup } from "./extensions";

interface FileEditorProps {
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

export const FileEditor = React.forwardRef<EditorView | null, FileEditorProps>(
  (props, forwardedRef) => {
    const {
      className,
      file,
      extension: extraExt,
      loadState,
      saveState,
    } = props;
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

    // Fixed tooltip container is not cleaned up on destroy, manually clean it up.
    const tooltipParentRef = useRef<HTMLElement | null>(null);
    useLayoutEffect(() => {
      return () => tooltipParentRef.current?.remove();
    }, []);

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

      tooltipParentRef.current?.remove();
      tooltipParentRef.current = document.createElement("div");
      document.body.appendChild(tooltipParentRef.current);

      setEditorProps({
        initialState,
        extension: [
          setup,
          tooltips({ position: "fixed", parent: tooltipParentRef.current }),
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
            ".cm-tooltip": {
              userSelect: "text",
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
        className={className}
        {...editorProps}
      />
    ) : null;
  },
);

const persistedFields = {
  history: historyField,
  fold: foldState,
};

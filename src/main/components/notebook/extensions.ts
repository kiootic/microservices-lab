import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { indentLess, insertTab } from "@codemirror/commands";
import {
  bracketMatching,
  codeFolding,
  foldKeymap,
  indentOnInput,
} from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import {
  KeyBinding,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { prettier } from "../../editor/prettier";
import { foldGutter } from "../editor/theme";

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

export const setup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  codeFolding(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  crosshairCursor(),
  prettier(),
  keymap.of([...closeBracketsKeymap, ...foldKeymap, ...tabKeymap]),
];

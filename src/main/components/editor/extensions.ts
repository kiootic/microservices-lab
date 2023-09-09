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
  codeFolding,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import {
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
import { prettier } from "../../editor/prettier";
import { foldGutter } from "./theme";

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
  highlightSpecialChars(),
  highlightActiveLineGutter(),
  history(),
  codeFolding(),
  foldGutter(),
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
];

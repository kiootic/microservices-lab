import { Completion, autocompletion } from "@codemirror/autocomplete";
import {
  HighlightStyle,
  foldGutter as cmFoldGutter,
  syntaxHighlighting,
} from "@codemirror/language";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { CompletionKind } from "../../editor/completion";

const colors = {
  "editor.background": "#ffffff",
  "editor.foreground": "#3b3b3b",
  "editor.inactiveSelectionBackground": "#e5ebf1",
  "editor.selectionHighlightBackground": "#add6ff80",
  "editor.wordHighlightBackground": "#57575740",
  "editor.wordHighlightStrongBackground": "#0e639c40",
  "editorCursor.foreground": "#000000",
  "editorLineNumber.activeForeground": "#171184",
  "editorLineNumber.foreground": "#6e7681",
  "editorBracketMatch.background": "#0064001a",
  "editorBracketMatch.border": "#b9b9b9",
  "editorHoverWidget.background": "#ffffff",
  "editorHoverWidget.border": "#c8c8c8",
  "editorHoverWidget.border/separator": "#c8c8c880",
  "editorHoverWidget.foreground": "#3b3b3b",
  "editorSuggestWidget.highlightForeground": "#0066bf",
  "editorSuggestWidget.selectedBackground": "#e8e8e8",
  "editorSuggestWidget.selectedForeground": "#000000",
  "editorSuggestWidget.selectedIconForeground": "#000000",
  "symbolIcon.classForeground": "#d67e00",
  "symbolIcon.constantForeground": "#cccccc",
  "symbolIcon.enumeratorForeground": "#d67e00",
  "symbolIcon.enumeratorMemberForeground": "#007acc",
  "symbolIcon.fieldForeground": "#007acc",
  "symbolIcon.fileForeground": "#3b3b3b",
  "symbolIcon.folderForeground": "#3b3b3b",
  "symbolIcon.functionForeground": "#652d90",
  "symbolIcon.interfaceForeground": "#007acc",
  "symbolIcon.keywordForeground": "#3b3b3b",
  "symbolIcon.methodForeground": "#652d90",
  "symbolIcon.moduleForeground": "#3b3b3b",
  "symbolIcon.propertyForeground": "#3b3b3b",
  "symbolIcon.variableForeground": "#007acc",
  "highlight.comment": "#008000",
  "highlight.constant.numeric": "#098658",
  "highlight.constant.regexp": "#811F3F",
  "highlight.string": "#A31515",
  "highlight.keyword": "#0000FF",
  "highlight.keyword.control": "#AF00DB",
  "highlight.keyword.operator": "#000000",
  "highlight.entity.name.function": "#795E26",
  "highlight.entity.name.type": "#267F99",
  "highlight.variable": "#001080",
  "highlight.variable.other.constant": "#0070C1",
};

const theme = EditorView.theme({
  "& .cm-scroller": { lineHeight: "unset" },
  "&.cm-focused": { outline: "none" },

  "&": {
    color: colors["editor.foreground"],
  },
  ".cm-content": {
    caretColor: colors["editorCursor.foreground"],
  },
  ".cm-cursor": {
    borderLeftWidth: "2px",
    marginLeft: "-1px",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: colors["editorCursor.foreground"],
  },
  ".cm-selectionBackground": {
    backgroundColor: colors["editor.inactiveSelectionBackground"],
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, ::selection":
    {
      backgroundColor: colors["editor.selectionHighlightBackground"],
    },
  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: colors["editorBracketMatch.background"],
    outlineColor: colors["editorBracketMatch.border"],
    outlineWidth: "1px",
    outlineStyle: "solid",
  },
  ".cm-gutters": {
    backgroundColor: "unset",
    border: "none",
    userSelect: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "unset",
  },
  ".cm-foldGutter": {
    opacity: 0,
    "&:hover": {
      opacity: 1,
    },
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px",
    color: colors["editorLineNumber.foreground"],
  },
  ".cm-lineNumbers .cm-activeLineGutter": {
    color: colors["editorLineNumber.activeForeground"],
  },
  ".cm-selectionMatch": {
    backgroundColor: colors["editor.wordHighlightBackground"],
  },
  ".cm-selectionMatch-main": {
    backgroundColor: colors["editor.wordHighlightStrongBackground"],
  },
  ".cm-tooltip": {
    borderColor: colors["editorHoverWidget.border"],
    backgroundColor: colors["editorHoverWidget.background"],
    color: colors["editorHoverWidget.foreground"],
    borderRadius: "3px",
  },
  ".cm-tooltip-hover": {
    overflow: "hidden",
  },
  ".cm-tooltip hr": {
    borderColor: colors["editorHoverWidget.border/separator"],
  },
  ".cm-tooltip-section:not(:first-child)": {
    borderTopColor: colors["editorHoverWidget.border/separator"],
  },
  ".cm-diagnostic": {
    padding: "0.25rem 0.5rem",
    fontFamily: "monospace",
  },
  ".cm-diagnostic:not(:first-child)": {
    borderTopColor: colors["editorHoverWidget.border/separator"],
    borderTopWidth: "1px",
    borderTopStyle: "solid",
  },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul > li": {
      lineHeight: "unset",
      display: "flex",
      alignItems: "center",
      padding: "0 4px",
      columnGap: "4px",
    },
    "& > ul > li[aria-selected]": {
      background: colors["editorSuggestWidget.selectedBackground"],
      color: colors["editorSuggestWidget.selectedForeground"],
    },
    "& > ul > li[aria-selected] .codicon": {
      color: colors["editorSuggestWidget.selectedIconForeground"],
    },
  },
  ".cm-tooltip.cm-completionInfo": {
    padding: "0.25rem 0.5rem",
    fontFamily: "monospace",
  },
  ".cm-completionMatchedText": {
    fontWeight: "600",
    color: colors["editorSuggestWidget.highlightForeground"],
    textDecoration: "none",
  },
  ".codicon-symbol-module": {
    color: colors["symbolIcon.moduleForeground"],
  },
  ".codicon-symbol-class": {
    color: colors["symbolIcon.classForeground"],
  },
  ".codicon-symbol-method": {
    color: colors["symbolIcon.methodForeground"],
  },
  ".codicon-symbol-property": {
    color: colors["symbolIcon.propertyForeground"],
  },
  ".codicon-symbol-field": {
    color: colors["symbolIcon.fieldForeground"],
  },
  ".codicon-symbol-enum": {
    color: colors["symbolIcon.enumeratorForeground"],
  },
  ".codicon-symbol-interface": {
    color: colors["symbolIcon.interfaceForeground"],
  },
  ".codicon-symbol-function": {
    color: colors["symbolIcon.functionForeground"],
  },
  ".codicon-symbol-variable": {
    color: colors["symbolIcon.variableForeground"],
  },
  ".codicon-symbol-constant": {
    color: colors["symbolIcon.constantForeground"],
  },
  ".codicon-symbol-enum-member": {
    color: colors["symbolIcon.enumeratorMemberForeground"],
  },
  ".codicon-symbol-keyword": {
    color: colors["symbolIcon.keywordForeground"],
  },
  ".codicon-symbol-file": {
    color: colors["symbolIcon.fileForeground"],
  },
  ".codicon-symbol-folder": {
    color: colors["symbolIcon.folderForeground"],
  },
});

const highlightStyle = HighlightStyle.define([
  { tag: [t.comment], color: colors["highlight.comment"] },
  { tag: [t.number], color: colors["highlight.constant.numeric"] },
  { tag: [t.regexp], color: colors["highlight.constant.regexp"] },
  { tag: [t.string], color: colors["highlight.string"] },
  {
    tag: [t.keyword, t.bool, t.self, t.atom, t.null, t.modifier],
    color: colors["highlight.keyword"],
  },
  { tag: [t.controlKeyword], color: colors["highlight.keyword.control"] },
  {
    tag: [t.operator],
    color: colors["highlight.keyword.operator"],
  },
  {
    tag: [
      t.function(t.variableName),
      t.function(t.propertyName),
      t.function(t.definition(t.variableName)),
    ],
    color: colors["highlight.entity.name.function"],
  },
  {
    tag: [t.typeName, t.className],
    color: colors["highlight.entity.name.type"],
  },
  {
    tag: [t.variableName, t.propertyName],
    color: colors["highlight.variable"],
  },
  {
    tag: [t.constant(t.variableName)],
    color: colors["highlight.variable.other.constant"],
  },
]);

const iconMap: Record<CompletionKind, string> = {
  module: "codicon-symbol-module",
  class: "codicon-symbol-class",
  method: "codicon-symbol-method",
  property: "codicon-symbol-property",
  field: "codicon-symbol-field",
  enum: "codicon-symbol-enum",
  interface: "codicon-symbol-interface",
  function: "codicon-symbol-function",
  variable: "codicon-symbol-variable",
  constant: "codicon-symbol-constant",
  "enum-member": "codicon-symbol-enum-member",
  keyword: "codicon-symbol-keyword",
  file: "codicon-symbol-file",
  folder: "codicon-symbol-folder",
};

const autocompleteIcon: Extension = autocompletion({
  icons: false,
  addToOptions: [
    {
      render(completion: Completion) {
        const icon = document.createElement("div");

        const kind = completion.type;
        if (kind && kind in iconMap) {
          icon.classList.add("codicon", iconMap[kind as CompletionKind]);
        }

        icon.setAttribute("aria-hidden", "true");
        return icon;
      },
      position: 20,
    },
  ],
});

export function foldGutter(): Extension {
  return cmFoldGutter({
    markerDOM: (open) => {
      const marker = document.createElement("span");
      marker.classList.add(
        "codicon",
        open ? "codicon-chevron-down" : "codicon-chevron-right",
      );
      return marker;
    },
  });
}

export const themeExtension: Extension = [
  theme,
  syntaxHighlighting(highlightStyle),
  autocompleteIcon,
];

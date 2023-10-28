import {
  javascriptLanguage,
  typescriptLanguage,
} from "@codemirror/lang-javascript";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  HighlightStyle,
  Language,
  syntaxHighlighting,
} from "@codemirror/language";
import { Extension } from "@codemirror/state";
import { Tag, styleTags, tags as t } from "@lezer/highlight";

import { EditorView } from "@codemirror/view";
import styles from "./markdown.module.css";

const listMark = Tag.define();
const codeText = Tag.define();
const table = Tag.define();

const mdHighlighting = styleTags({
  ListMark: listMark,
  "InlineCode CodeText": codeText,
  "Table/...": table,
  TaskMarker: table,
});

const codeHighlighting = styleTags({
  "Script/...": codeText,
});

const jsLang = javascriptLanguage;
const tsLang = typescriptLanguage;

const languageMap = new Map<string, Language>([
  ["js", jsLang.configure({ props: [codeHighlighting] })],
  ["ts", tsLang.configure({ props: [codeHighlighting] })],
]);

export const language = markdown({
  codeLanguages: (info) => languageMap.get(info) ?? null,
  base: markdownLanguage,
  completeHTMLTags: false,
  extensions: [{ props: [mdHighlighting] }],
});

const highlightStyle = HighlightStyle.define([
  { tag: t.processingInstruction, class: styles["markup"] },
  { tag: listMark, class: styles["list-mark"] },
  { tag: t.labelName, class: styles["code"] },
  { tag: codeText, class: styles["code"] },

  { tag: t.heading, class: styles["heading"] },
  { tag: t.heading1, class: styles["heading1"] },
  { tag: t.heading2, class: styles["heading2"] },

  { tag: t.quote, class: styles["quote"] },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.url, class: styles["url"] },
  { tag: t.link, class: styles["link"] },
  { tag: t.contentSeparator, class: styles["separator"] },

  { tag: table, class: styles["table"] },
]);

export const markdownExtension: Extension = [
  language,
  syntaxHighlighting(highlightStyle),
  EditorView.theme({
    "& .cm-content": {
      lineHeight: "unset",
      fontFamily: "var(--font-family-sans, sans-serif)",
    },
  }),
];

import {
  javascriptLanguage,
  typescriptLanguage,
} from "@codemirror/lang-javascript";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  HighlightStyle,
  Language,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import { Extension, Facet, Range } from "@codemirror/state";
import { Tag, styleTags, tags as t } from "@lezer/highlight";

import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import styles from "./markdown.module.css";

const listMark = Tag.define();
const codeText = Tag.define();
const table = Tag.define();
const linkLabel = Tag.define();
const linkTitle = Tag.define();

const mdHighlighting = styleTags({
  ListMark: listMark,
  "InlineCode CodeText": codeText,
  "Table/...": table,
  LinkLabel: linkLabel,
  LinkTitle: linkTitle,
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
  { tag: t.link, class: styles["link"] },
  { tag: linkTitle, class: styles["link-title"] },
  { tag: t.url, class: styles["url"] },
  { tag: t.contentSeparator, class: styles["separator"] },

  { tag: table, class: styles["table"] },
]);

export const markdownLinkHandler = Facet.define<(link: string) => void>();

class LinkWidget extends WidgetType {
  private readonly link: string;
  constructor(link: string) {
    super();
    this.link = link;
  }

  eq(other: LinkWidget) {
    return other.link == this.link;
  }

  toDOM(view: EditorView) {
    const button = document.createElement("button");
    button.setAttribute("aria-hidden", "true");
    button.classList.add(styles["link-button"]);
    const icon = button.appendChild(document.createElement("span"));
    icon.classList.add("codicon", "codicon-link-external");
    button.addEventListener("click", () => this.handleOnClick(view));
    return button;
  }

  private handleOnClick(view: EditorView) {
    const handlers = view.state.facet(markdownLinkHandler);
    handlers.forEach((fn) => fn(this.link));
  }
}

function linkDecorations(view: EditorView) {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node) => {
        if (node.name == "URL") {
          const link = view.state.doc.sliceString(node.from, node.to);
          const decor = Decoration.widget({
            widget: new LinkWidget(link),
          });
          decorations.push(decor.range(node.from));
        }
      },
    });
  }
  return Decoration.set(decorations);
}

const linkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = linkDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged)
        this.decorations = linkDecorations(update.view);
    }
  },
  { decorations: (v) => v.decorations },
);

export const markdownExtension: Extension = [
  language,
  syntaxHighlighting(highlightStyle),
  linkPlugin,
  EditorView.theme({
    "& .cm-content": {
      lineHeight: "unset",
      fontFamily: "var(--font-family-sans, sans-serif)",
    },
  }),
];

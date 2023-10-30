import { Annotation, Extension, Facet } from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  showTooltip,
} from "@codemirror/view";
import { format } from "prettier";
import * as pluginESTree from "prettier/plugins/estree";
import * as pluginMarkdown from "prettier/plugins/markdown";
import * as pluginTS from "prettier/plugins/typescript";

const formatCode = Annotation.define<boolean>();

type FormatFn = (code: string) => Promise<string | null>;
const formatFn = Facet.define<FormatFn>();

async function formatTypeScript(code: string) {
  try {
    return await format(code, {
      parser: "typescript",
      plugins: [pluginESTree, pluginTS],
    });
  } catch (e) {
    return null;
  }
}

async function formatMarkdown(code: string) {
  try {
    return await format(code, {
      parser: "markdown",
      plugins: [pluginMarkdown],
    });
  } catch (e) {
    return null;
  }
}

const plugin = ViewPlugin.fromClass(
  class {
    private readonly view: EditorView;
    private needFormat = false;

    constructor(view: EditorView) {
      this.view = view;
    }

    update(update: ViewUpdate) {
      if (
        update.transactions.some(
          (tx) => tx.docChanged && !tx.annotation(formatCode),
        )
      ) {
        this.needFormat = true;
      }

      const hasTooltip = update.state.facet(showTooltip).some((t) => t != null);
      if (!update.view.hasFocus && !hasTooltip && this.needFormat) {
        void this.applyPrettier(update.state.doc.toString());
      }
    }

    private async applyPrettier(code: string) {
      this.needFormat = false;
      const fn = this.view.state.facet(formatFn)[0];
      const newCode = await fn(code);

      if (newCode == null || newCode === code || this.needFormat) {
        return;
      }

      const doc = this.view.state.doc;
      this.view.dispatch({
        annotations: [formatCode.of(true)],
        changes: this.view.state.changes({
          from: 0,
          to: doc.length,
          insert: newCode,
        }),
      });
    }
  },
);

export function prettierTypeScript(): Extension {
  return [plugin, formatFn.of(formatTypeScript)];
}

export function prettierMarkdown(): Extension {
  return [plugin, formatFn.of(formatMarkdown)];
}

import { Annotation, Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { format } from "prettier";
import * as prettierESTree from "prettier/plugins/estree";
import * as prettierTS from "prettier/plugins/typescript";

const formatCode = Annotation.define<boolean>();

const plugin = ViewPlugin.fromClass(
  class {
    private readonly view: EditorView;
    private dirty = false;
    constructor(view: EditorView) {
      this.view = view;
    }

    update(update: ViewUpdate) {
      if (
        update.transactions.some(
          (tx) => tx.docChanged && !tx.annotation(formatCode),
        )
      ) {
        this.dirty = true;
      }

      if (update.focusChanged && !update.view.hasFocus) {
        this.applyPrettier(update.state.doc.toString());
      }
    }

    private async format(code: string) {
      try {
        return await format(code, {
          parser: "typescript",
          plugins: [prettierESTree, prettierTS],
        });
      } catch (e) {
        return null;
      }
    }

    private async applyPrettier(code: string) {
      this.dirty = false;
      const newCode = await this.format(code);

      if (newCode == null || newCode === code || this.dirty) {
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

export function prettier(): Extension {
  return plugin;
}

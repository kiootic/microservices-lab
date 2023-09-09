import { Extension, StateEffect, StateField } from "@codemirror/state";
import {
  EditorView,
  PluginValue,
  Tooltip,
  ViewPlugin,
  ViewUpdate,
  keymap,
  showTooltip,
} from "@codemirror/view";
import React, { useMemo } from "react";
import ts from "typescript";
import { WorkspaceFile } from "../model/workspace";
import { clickOutsideHandler } from "./click-outside";
import { SymbolDisplay, TagsDisplay } from "./symbol";
import { ReactTooltip } from "./tooltip";

const signatureHelpTriggerCharacters = new Set(["(", ")", ",", "<"]);

const updateSignatureHelp = StateEffect.define<
  ts.SignatureHelpItems | undefined
>();

interface State {
  tooltip: Tooltip;
  signatureHelp: ts.SignatureHelpItems;
}

const field = StateField.define<State | null>({
  create() {
    return null;
  },
  update(value, tx) {
    const update: StateEffect<ts.SignatureHelpItems | undefined> | undefined =
      tx.effects.find((e) => e.is(updateSignatureHelp));
    if (update != null) {
      if (update.value == null) {
        value = null;
      } else {
        const signatureHelp = update.value;
        value = {
          tooltip: value?.tooltip ?? {
            pos: tx.state.selection.main.from,
            create: () => new ReactTooltip(() => <SignatureHelpTooltip />),
            above: true,
          },
          signatureHelp,
        };
      }
    }

    if (value != null && tx.selection != null) {
      value = {
        ...value,
        tooltip: { ...value.tooltip, pos: tx.state.selection.main.from },
      };
    }
    return value;
  },
  provide: (field) => showTooltip.from(field, (s) => s?.tooltip ?? null),
});

// eslint-disable-next-line react-refresh/only-export-components
const SignatureHelpTooltip: React.FC = () => {
  const help = ReactTooltip.useEditorState().field(field)?.signatureHelp;

  const item = help == null ? undefined : help.items[help.selectedItemIndex];
  const argIndex = help?.argumentIndex ?? 0;

  const symbolDisplay = useMemo(() => {
    if (item == null) {
      return [];
    }

    const prefix: Array<ts.SymbolDisplayPart[]> = [];
    let arg: ts.SymbolDisplayPart[] = [];
    const suffix: Array<ts.SymbolDisplayPart[]> = [];

    for (let i = 0; i < item.parameters.length; i++) {
      if (i === argIndex) {
        if (i !== 0) {
          prefix.push(item.separatorDisplayParts);
        }
        arg = item.parameters[i].displayParts;
        continue;
      }

      const section = i < argIndex ? prefix : suffix;
      if (i !== 0) {
        section.push(item.separatorDisplayParts);
      }
      section.push(item.parameters[i].displayParts);
    }

    prefix.unshift(item.prefixDisplayParts);
    suffix.push(item.suffixDisplayParts);

    const prefixString = ts.displayPartsToString(prefix.flat());
    const argString = ts.displayPartsToString(arg.flat());
    const suffixString = ts.displayPartsToString(suffix.flat());

    return (
      <>
        <span>{prefixString}</span>
        <b>{argString}</b>
        <span>{suffixString}</span>
      </>
    );
  }, [item, argIndex]);

  if (item == null) {
    return null;
  }

  const argDoc = item.parameters[argIndex]?.documentation ?? [];

  return (
    <div className="whitespace-pre-wrap px-2 py-1 space-y-1">
      <p className="font-mono">{symbolDisplay}</p>

      {item.documentation.length > 0 ||
      argDoc.length > 0 ||
      item.tags.length > 0 ? (
        <hr className="-mx-2" />
      ) : null}

      <SymbolDisplay parts={argDoc} />
      <SymbolDisplay parts={item.documentation} />
      <TagsDisplay tags={item.tags} />
    </div>
  );
};

class Plugin implements PluginValue {
  private readonly view: EditorView;
  private readonly file: WorkspaceFile;

  private timer: number | null = null;

  constructor(view: EditorView, file: WorkspaceFile) {
    this.view = view;
    this.file = file;
  }

  get isTriggered(): boolean {
    return this.view.state.field(field) != null;
  }

  update(update: ViewUpdate): void {
    const isTriggered = this.isTriggered;

    const needUpdate = update.transactions.some(
      (tx) =>
        tx.isUserEvent("input") ||
        tx.isUserEvent("delete") ||
        (isTriggered && tx.isUserEvent("select")),
    );
    if (!needUpdate) {
      return;
    }

    if (isTriggered) {
      this.run({ kind: "retrigger" });
    } else {
      const from = update.state.selection.main.from;
      const char = update.state.doc.sliceString(from - 1, from);
      if (signatureHelpTriggerCharacters.has(char)) {
        this.trigger(char);
      }
    }
  }

  trigger(key: string) {
    switch (key) {
      case ",":
      case "(":
      case "<":
        this.run({
          kind: this.isTriggered ? "retrigger" : "characterTyped",
          triggerCharacter: key,
        });
        break;
      case ")":
        if (this.isTriggered) {
          this.run({
            kind: "retrigger",
            triggerCharacter: key,
          });
        }
    }
  }

  hide() {
    if (this.isTriggered) {
      this.view.dispatch({ effects: [updateSignatureHelp.of(undefined)] });
    }
    if (this.timer != null) {
      clearTimeout(this.timer);
    }
  }

  private run(reason: ts.SignatureHelpTriggerReason) {
    if (!this.view.state.selection.main.empty) {
      return;
    }

    if (this.timer == null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.updateSignatureHelp(reason);
      });
    }
  }

  destroy(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
    }
  }

  private updateSignatureHelp(reason: ts.SignatureHelpTriggerReason) {
    const selection = this.view.state.selection.main;
    if (!selection.empty) {
      this.hide();
      return;
    }

    const signatureHelp = this.file.getSignatureHelpItems(selection.from, {
      triggerReason: reason,
    });
    this.view.dispatch({ effects: [updateSignatureHelp.of(signatureHelp)] });
  }
}

export function tsSignatureHelp(file: WorkspaceFile): Extension {
  return [
    ViewPlugin.define((view) => new Plugin(view, file), {
      provide: (plugin) => [
        field,
        keymap.of([
          {
            key: "Escape",
            run: (view) => {
              const p = view.plugin(plugin);
              if (p?.isTriggered) {
                p.hide();
                return true;
              }
              return false;
            },
          },
        ]),
        clickOutsideHandler.of((view) => {
          view.plugin(plugin)?.hide();
        }),
      ],
    }),
  ];
}

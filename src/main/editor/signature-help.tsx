import { Extension, MapMode, StateEffect, StateField } from "@codemirror/state";
import {
  EditorView,
  PluginValue,
  Tooltip,
  ViewPlugin,
  ViewUpdate,
  showTooltip,
} from "@codemirror/view";
import React, { useMemo } from "react";
import ts from "typescript";
import { WorkspaceFile } from "../model/workspace";
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

const state = StateField.define<State | null>({
  create() {
    return null;
  },
  update(value, tx) {
    if (value != null) {
      const selection = tx.state.selection.main;
      const pos = tx.changes.mapPos(value.tooltip.pos, 1, MapMode.TrackDel);
      const keepTooltip = selection.empty && selection.from === pos;
      value = keepTooltip
        ? { ...value, tooltip: { ...value.tooltip, pos } }
        : null;
    }

    const update = tx.effects.find((e) => e.is(updateSignatureHelp));
    if (update != null) {
      if (update.value == null) {
        value = null;
      } else {
        value = {
          tooltip: value?.tooltip ?? {
            pos: tx.state.selection.main.from,
            create: () => new ReactTooltip(() => <SignatureHelpTooltip />),
            above: true,
          },
          signatureHelp: update.value,
        };
      }
    }
    return value;
  },
  provide: (field) => showTooltip.from(field, (s) => s?.tooltip ?? null),
});

// eslint-disable-next-line react-refresh/only-export-components
const SignatureHelpTooltip: React.FC = () => {
  const help = ReactTooltip.useEditorState().field(state)?.signatureHelp;

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
    <div className="whitespace-pre-wrap">
      <p className="p-1 font-mono">{symbolDisplay}</p>

      {item.documentation.length > 0 ||
      argDoc.length > 0 ||
      item.tags.length > 0 ? (
        <hr />
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

  private isTriggered = false;
  private timer: number | null = null;

  constructor(view: EditorView, file: WorkspaceFile) {
    this.view = view;
    this.file = file;
  }

  update(update: ViewUpdate): void {
    const isUserInput = update.transactions.some(
      (tx) => tx.docChanged && tx.isUserEvent("input.type")
    );

    if (!isUserInput) {
      return;
    }

    if (this.isTriggered) {
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
      this.isTriggered = false;
      this.view.dispatch({ effects: [updateSignatureHelp.of(undefined)] });
      return;
    }

    const signatureHelp = this.file.getSignatureHelpItems(selection.from, {
      triggerReason: reason,
    });
    this.isTriggered = signatureHelp != null;
    this.view.dispatch({ effects: [updateSignatureHelp.of(signatureHelp)] });
  }
}

export function tsSignatureHelp(file: WorkspaceFile): Extension {
  return [
    ViewPlugin.define((view) => new Plugin(view, file), {
      provide: () => state,
    }),
  ];
}

import { Extension } from "@codemirror/state";
import { Tooltip, hoverTooltip } from "@codemirror/view";
import React from "react";
import ts from "typescript";
import { WorkspaceFile } from "../model/workspace";
import { SymbolDisplay, TagsDisplay } from "./symbol";
import { ReactTooltip } from "./tooltip";

// eslint-disable-next-line react-refresh/only-export-components
const HoverTooltip: React.FC<{ info: ts.QuickInfo }> = ({ info }) => {
  const { displayParts = [], documentation = [], tags = [] } = info;
  return (
    <div className="whitespace-pre-wrap px-2 py-1 space-y-1">
      <SymbolDisplay className="font-mono" parts={displayParts} />

      {documentation.length > 0 || tags.length > 0 ? (
        <hr className="-mx-2" />
      ) : null}

      <SymbolDisplay parts={documentation} />
      <TagsDisplay tags={tags} />
    </div>
  );
};

export function getHoverText(file: WorkspaceFile, pos: number): Tooltip | null {
  try {
    const result = file.getQuickInfoAtPosition(pos);
    if (result == null || result.displayParts?.length === 0) {
      return null;
    }

    return {
      pos: result.textSpan.start,
      end: result.textSpan.start + result.textSpan.length,
      create() {
        return new ReactTooltip(() => <HoverTooltip info={result} />);
      },
    };
  } catch (e) {
    return null;
  }
}

export function tsQuickInfo(file: WorkspaceFile): Extension {
  return [
    hoverTooltip((_, pos) => getHoverText(file, pos), {
      hideOnChange: true,
    }),
  ];
}

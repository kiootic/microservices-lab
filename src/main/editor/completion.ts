import {
  Completion,
  CompletionContext,
  CompletionResult,
  acceptCompletion,
  autocompletion,
  selectedCompletion,
} from "@codemirror/autocomplete";
import { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import ts from "typescript";
import { WorkspaceFile } from "../model/workspace";

// ref: https://github.com/typescript-language-server/typescript-language-server/blob/983a6923114c39d638e0c7d419ae16e8bca8985c/src/completion.ts

interface TSCompletion extends Completion {
  ts?: TSCompletionData;
}

interface TSCompletionData {
  preselect: boolean;
  sortText: string;
  commitCharacters: string[];
}

export type CompletionKind =
  | "keyword"
  | "variable"
  | "field"
  | "function"
  | "method"
  | "enum"
  | "enum-member"
  | "module"
  | "class"
  | "interface"
  | "file"
  | "folder"
  | "constant"
  | "property";

function mapCompletionKind(kind: ts.ScriptElementKind): CompletionKind {
  switch (kind) {
    case ts.ScriptElementKind.primitiveType:
    case ts.ScriptElementKind.keyword:
      return "keyword";

    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.variableElement:
    case ts.ScriptElementKind.localVariableElement:
    case ts.ScriptElementKind.alias:
    case ts.ScriptElementKind.parameterElement:
      return "variable";

    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
      return "field";

    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.localFunctionElement:
      return "function";

    case ts.ScriptElementKind.memberFunctionElement:
    case ts.ScriptElementKind.constructSignatureElement:
    case ts.ScriptElementKind.callSignatureElement:
    case ts.ScriptElementKind.indexSignatureElement:
      return "method";

    case ts.ScriptElementKind.enumElement:
      return "enum";

    case ts.ScriptElementKind.enumMemberElement:
      return "enum-member";

    case ts.ScriptElementKind.moduleElement:
    case ts.ScriptElementKind.externalModuleName:
      return "module";

    case ts.ScriptElementKind.classElement:
    case ts.ScriptElementKind.typeElement:
      return "class";

    case ts.ScriptElementKind.interfaceElement:
      return "interface";

    case ts.ScriptElementKind.warning:
    case ts.ScriptElementKind.scriptElement:
      return "file";

    case ts.ScriptElementKind.directory:
      return "folder";

    case ts.ScriptElementKind.string:
      return "constant";

    default:
      return "property";
  }
}

type CMCommitCharacter = "." | "," | "(";
const completionCommitCharacters: CMCommitCharacter[] = [".", ",", "("];
function mapCommitCharacters(kind: ts.ScriptElementKind): CMCommitCharacter[] {
  switch (kind) {
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
    case ts.ScriptElementKind.constructSignatureElement:
    case ts.ScriptElementKind.callSignatureElement:
    case ts.ScriptElementKind.indexSignatureElement:
    case ts.ScriptElementKind.enumElement:
    case ts.ScriptElementKind.interfaceElement:
      return ["."];

    case ts.ScriptElementKind.moduleElement:
    case ts.ScriptElementKind.alias:
    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.variableElement:
    case ts.ScriptElementKind.localVariableElement:
    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.classElement:
    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.memberFunctionElement:
      return [".", ",", "("];
  }
  return [];
}

function mapCompletion(entry: ts.CompletionEntry): TSCompletion {
  return {
    type: mapCompletionKind(entry.kind),
    label: entry.name,
    ts: {
      preselect: entry.isRecommended ?? false,
      sortText: entry.sortText,
      commitCharacters: mapCommitCharacters(entry.kind),
    },
  };
}

const completionTriggerChars = new Set<ts.CompletionsTriggerCharacter>([
  "@",
  "#",
  " ",
  ".",
  '"',
  "'",
  "`",
  "/",
  "<",
]);
const completionTriggerCharRegex = new RegExp(
  `(${[...completionTriggerChars, "\n"].map((c) => "\\" + c).join("|")})$`,
);

function getTSCompletionOptions(
  ctx: CompletionContext,
): ts.GetCompletionsAtPositionOptions | null {
  const options: ts.GetCompletionsAtPositionOptions = {
    triggerKind: ts.CompletionTriggerKind.Invoked,
  };

  if (ctx.explicit) {
    return options;
  }

  const triggerText = ctx.matchBefore(completionTriggerCharRegex);
  if (triggerText != null) {
    options.triggerKind = ts.CompletionTriggerKind.TriggerCharacter;
    options.triggerCharacter =
      triggerText.text as ts.CompletionsTriggerCharacter;
    return options;
  }

  ctx.aborted;
  const identifierToken = ctx.matchBefore(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
  if (identifierToken != null) {
    return options;
  }

  return null;
}

export function getCompletions(
  ctx: CompletionContext,
  file: WorkspaceFile,
): CompletionResult | null {
  const { pos } = ctx;
  try {
    const options = getTSCompletionOptions(ctx);
    if (options == null) {
      return null;
    }

    const result = file.getCompletionsAtPosition(pos, options);

    if (result == null) {
      return null;
    }

    let from = pos;
    let to: number | undefined;
    if (result.optionalReplacementSpan != null) {
      from = result.optionalReplacementSpan.start;
      to = from + result.optionalReplacementSpan.length;
    }

    const completions: TSCompletion[] = [];
    for (const entry of result.entries) {
      if (entry.kind === ts.ScriptElementKind.warning) {
        continue;
      }
      completions.push(mapCompletion(entry));
    }
    console.log(result.entries);

    return {
      from,
      to,
      options: completions,
      validFor: /^\w*$/,
    };
  } catch (e) {
    return null;
  }
}

function tryCommitCompletion(char: string, view: EditorView) {
  const completion: TSCompletion | null = selectedCompletion(view.state);
  if (completion != null && completion.ts?.commitCharacters.includes(char)) {
    acceptCompletion(view);
  }
}

export function tsAutocompletion(file: WorkspaceFile): Extension {
  return [
    autocompletion({
      maxRenderedOptions: 100,
      override: [(ctx) => getCompletions(ctx, file)],
    }),
    keymap.of([
      ...completionCommitCharacters.map((key) => ({
        key,
        run: (view: EditorView) => {
          if (!view.composing) {
            tryCommitCompletion(key, view);
          }
          return false;
        },
      })),
    ]),
  ];
}

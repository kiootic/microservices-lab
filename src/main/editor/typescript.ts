import { typescriptLanguage } from "@codemirror/lang-javascript";
import { Extension } from "@codemirror/state";
import { WorkspaceFile } from "../model/workspace";
import { tsAutocompletion } from "./completion";
import { tsLint } from "./lint";
import { tsQuickInfo } from "./quick-info";
import { tsSignatureHelp } from "./signature-help";

export function typescriptIntegration(file: WorkspaceFile): Extension {
  return [
    typescriptLanguage,
    tsAutocompletion(file),
    tsLint(file),
    tsQuickInfo(file),
    tsSignatureHelp(file),
  ];
}

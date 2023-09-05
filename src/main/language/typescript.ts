import { typescriptLanguage } from "@codemirror/lang-javascript";
import { Extension } from "@codemirror/state";
import { Workspace } from "../workspace/workspace";
import { tsAutocompletion } from "./completion";
import { tsLint } from "./lint";
import { tsQuickInfo } from "./quick-info";
import { tsSignatureHelp } from "./signature-help";

export function typescriptIntegration(
  workspace: Workspace,
  fileName: string,
): Extension {
  return [
    typescriptLanguage,
    tsAutocompletion(workspace, fileName),
    tsLint(workspace, fileName),
    tsQuickInfo(workspace, fileName),
    tsSignatureHelp(workspace, fileName),
  ];
}

import { Diagnostic, setDiagnostics } from "@codemirror/lint";
import { Extension } from "@codemirror/state";
import { EditorView, PluginValue, ViewPlugin } from "@codemirror/view";
import ts from "typescript";
import { Workspace } from "../workspace/workspace";

function mapDiagnostics(diagnostics: ts.Diagnostic[]): Diagnostic[] {
  return diagnostics.flatMap((d) => {
    if (d.start == null || d.length == null) {
      return [];
    }
    const from = d.start;
    const to = d.start + d.length;

    let severity: Diagnostic["severity"];
    switch (d.category) {
      case ts.DiagnosticCategory.Error:
        severity = "error";
        break;
      case ts.DiagnosticCategory.Warning:
        severity = "warning";
        break;
      case ts.DiagnosticCategory.Message:
        severity = "info";
        break;
      case ts.DiagnosticCategory.Suggestion:
        severity = "hint";
        break;
    }

    return {
      from,
      to,
      severity,
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    };
  });
}

function getLintDiagnostics(
  workspace: Workspace,
  fileName: string,
): Diagnostic[] {
  try {
    return mapDiagnostics([
      ...workspace.lang.getSyntacticDiagnostics(fileName),
      ...workspace.lang.getSemanticDiagnostics(fileName),
    ]);
  } catch {
    return [];
  }
}

const lintIntervalMS = 300;

class Plugin implements PluginValue {
  private readonly view: EditorView;
  private readonly workspace: Workspace;
  private readonly fileName: string;

  private readonly dispose: () => void;
  private timer: number | null = null;
  private needLint = false;
  private throttled = false;

  constructor(view: EditorView, workspace: Workspace, fileName: string) {
    this.view = view;
    this.workspace = workspace;
    this.fileName = fileName;

    this.dispose = workspace.subscribe(() => {
      this.scheduleLint();
    });
    queueMicrotask(() => this.scheduleLint());
  }

  private scheduleLint() {
    this.needLint = true;
    if (this.throttled) {
      return;
    }

    this.throttled = true;
    this.timer = setTimeout(() => {
      this.throttled = false;
      if (this.needLint) {
        this.scheduleLint();
      }
    }, lintIntervalMS);

    this.needLint = false;
    this.doLint();
  }

  private doLint() {
    const diagnostics = getLintDiagnostics(this.workspace, this.fileName);
    this.view.dispatch(setDiagnostics(this.view.state, diagnostics));
  }

  destroy() {
    if (this.timer != null) {
      clearTimeout(this.timer);
    }
    this.dispose();
  }
}

export function tsLint(workspace: Workspace, fileName: string): Extension {
  return ViewPlugin.define((view) => new Plugin(view, workspace, fileName));
}

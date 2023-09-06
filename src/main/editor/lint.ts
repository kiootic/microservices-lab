import { Diagnostic, setDiagnostics } from "@codemirror/lint";
import { Extension } from "@codemirror/state";
import { EditorView, PluginValue, ViewPlugin } from "@codemirror/view";
import ts from "typescript";
import { WorkspaceFile } from "../model/workspace";

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

const lintIntervalMS = 300;

class Plugin implements PluginValue {
  private readonly view: EditorView;
  private readonly file: WorkspaceFile;

  private readonly dispose: () => void;
  private timer: number | null = null;
  private needLint = false;
  private throttled = false;

  constructor(view: EditorView, file: WorkspaceFile) {
    this.view = view;
    this.file = file;

    this.dispose = file.vfs.subscribe(() => {
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
    let diagnostics: Diagnostic[];
    try {
      diagnostics = mapDiagnostics([
        ...this.file.getSyntacticDiagnostics(),
        ...this.file.getSemanticDiagnostics(),
      ]);
    } catch {
      diagnostics = [];
    }
    this.view.dispatch(setDiagnostics(this.view.state, diagnostics));
  }

  destroy() {
    if (this.timer != null) {
      clearTimeout(this.timer);
    }
    this.dispose();
  }
}

export function tsLint(file: WorkspaceFile): Extension {
  return ViewPlugin.define((view) => new Plugin(view, file));
}

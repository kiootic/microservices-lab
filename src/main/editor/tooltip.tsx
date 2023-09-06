import { EditorState } from "@codemirror/state";
import { EditorView, TooltipView, ViewUpdate } from "@codemirror/view";
import React, { useContext } from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";

// eslint-disable-next-line react-refresh/only-export-components
const Context = React.createContext<EditorState | null>(null);

function useEditorState() {
  return useContext(Context)!;
}

export class ReactTooltip implements TooltipView {
  static readonly useEditorState = useEditorState;

  overlap?: boolean;

  readonly dom = document.createElement("div");
  private readonly root = createRoot(this.dom);
  private readonly render: () => JSX.Element;

  constructor(render: () => JSX.Element) {
    this.render = render;
  }

  mount(view: EditorView): void {
    this.renderDOM(view.state);
  }

  update(update: ViewUpdate): void {
    this.renderDOM(update.state);
  }

  private renderDOM(state: EditorState) {
    ReactDOM.flushSync(() =>
      this.root.render(
        <Context.Provider value={state}>{this.render()}</Context.Provider>,
      ),
    );
  }

  destroy(): void {
    this.root.unmount();
  }
}

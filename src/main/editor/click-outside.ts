import { Facet } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";

const subscribers = new Set<(e: PointerEvent) => void>();
document.addEventListener("pointerdown", (e) => {
  subscribers.forEach((cb) => cb(e));
});

const plugin = ViewPlugin.define((view) => {
  const callback = (e: PointerEvent) => {
    if (view.dom.contains(e.target as Node)) {
      return;
    }
    view.state.facet(clickOutsideHandler).forEach((cb) => cb(view));
  };
  subscribers.add(callback);
  return {
    destroy() {
      subscribers.delete(callback);
    },
  };
});

export const clickOutsideHandler = Facet.define<(view: EditorView) => void>({
  enables: plugin,
});

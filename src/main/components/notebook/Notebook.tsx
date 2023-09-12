import cn from "clsx";
import React, { useMemo, useRef } from "react";
import { useStore } from "zustand";
import { FileView } from "./FileView";
import styles from "./Notebook.module.css";
import { SideNav } from "./SideNav";
import { NotebookContext, NotebookContextValue } from "./context";
import { NotebookAction, NotebookController } from "./useNotebook";

interface NotebookProps {
  className?: string;
  controller: NotebookController;
}

export const Notebook: React.FC<NotebookProps> = (props) => {
  const { className, controller } = props;

  const ref = useRef<HTMLDivElement>(null);
  const { workspace } = controller;
  const fileNames = useStore(workspace, (w) => w.fileNames);

  const context = useMemo<NotebookContextValue>(
    () => ({
      ...controller,
      rootElementRef: ref,
      toggleOpen: (fileName, force) => {
        controller.state.setState((s) => ({
          isCollapsed: {
            ...s.isCollapsed,
            [fileName]: force != null ? !force : !s.isCollapsed[fileName],
          },
        }));
        return !controller.state.getState().isCollapsed[fileName];
      },

      visibleFileNames: new Set(),
      setIsVisible: (fileName, isVisible) =>
        controller.state.setState((s) => {
          const visibleFileNames = new Set(s.visibleFileNames);
          if (isVisible) {
            visibleFileNames.add(fileName);
          } else {
            visibleFileNames.delete(fileName);
          }
          return { visibleFileNames };
        }),

      activeAction: null,
      startAction: (action) =>
        controller.state.setState({ activeAction: action }),
      endAction: <K extends NotebookAction["kind"]>(kind: K) => {
        const action = controller.state.getState().activeAction;
        if (action?.kind !== kind) {
          return null;
        }
        controller.state.setState({ activeAction: null });
        return action as NotebookAction & { kind: K };
      },
    }),
    [controller],
  );

  return (
    <NotebookContext.Provider value={context}>
      <div ref={ref} className={cn("flex select-none", className)}>
        <SideNav className="flex-none w-64 border-r-2" />
        <div className={cn(styles["content"], "flex-1 overflow-auto")}>
          {fileNames.map((fileName) => (
            <FileView key={fileName} fileName={fileName} />
          ))}
          <hr className="ml-12 flex-1 border-t-2 mt-5" />
        </div>
      </div>
    </NotebookContext.Provider>
  );
};

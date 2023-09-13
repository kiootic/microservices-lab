import React, { useMemo, useRef, useState } from "react";
import { createStore } from "zustand";
import { NavView } from "../nav/NavView";
import { Content } from "./Content";
import { SideNav } from "./SideNav";
import {
  NotebookContext,
  NotebookContextValue,
  NotebookInternalState,
} from "./context";
import { NotebookAction, NotebookController } from "./useNotebook";

interface NotebookProps {
  className?: string;
  controller: NotebookController;
}

export const Notebook: React.FC<NotebookProps> = (props) => {
  const { className, controller } = props;

  const ref = useRef<HTMLDivElement>(null);

  const [internalState] = useState(() =>
    createStore<NotebookInternalState>(() => ({
      visibleFileNames: new Set(),
      activeAction: null,
    })),
  );

  const context = useMemo<NotebookContextValue>(
    () => ({
      ...controller,
      internalState,
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
        internalState.setState((s) => {
          const visibleFileNames = new Set(s.visibleFileNames);
          if (isVisible) {
            visibleFileNames.add(fileName);
          } else {
            visibleFileNames.delete(fileName);
          }
          return { visibleFileNames };
        }),

      activeAction: null,
      startAction: (action) => internalState.setState({ activeAction: action }),
      endAction: <K extends NotebookAction["kind"]>(kind: K) => {
        const action = internalState.getState().activeAction;
        if (action?.kind !== kind) {
          return null;
        }
        internalState.setState({ activeAction: null });
        return action as NotebookAction & { kind: K };
      },
    }),
    [controller, internalState],
  );

  return (
    <NotebookContext.Provider value={context}>
      <div ref={ref} className={className}>
        <NavView className="w-full h-full" label="Notebook">
          <NavView.Nav>
            <SideNav className="w-full h-full" />
          </NavView.Nav>
          <NavView.Content>
            <Content className="w-full h-full" />
          </NavView.Content>
        </NavView>
      </div>
    </NotebookContext.Provider>
  );
};

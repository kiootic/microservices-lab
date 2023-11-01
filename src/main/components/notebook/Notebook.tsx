import React, { useMemo } from "react";
import { NavView } from "../nav/NavView";
import { Content } from "./Content";
import { SideNav } from "./SideNav";
import {
  NotebookContext,
  NotebookContextValue,
  createContextValue,
} from "./context";
import { NotebookController } from "./useNotebook";
import { useIntl } from "react-intl";

interface NotebookProps {
  className?: string;
  controller: NotebookController;
}

export const Notebook: React.FC<NotebookProps> = (props) => {
  const { className, controller } = props;
  const intl = useIntl();

  const context = useMemo<NotebookContextValue>(
    () => createContextValue(controller),
    [controller],
  );

  return (
    <NotebookContext.Provider value={context}>
      <div ref={context.rootElementRef} className={className}>
        <NavView
          className="w-full h-full"
          label={intl.formatMessage({
            id: "views.notebook.label",
            defaultMessage: "Notebook",
          })}
        >
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

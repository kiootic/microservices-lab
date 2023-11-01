import React from "react";
import cn from "clsx";
import { AppButton } from "../AppButton";
import { FormattedMessage } from "react-intl";
import { useEventCallback } from "../../hooks/event-callback";
import { useNotebookContext } from "./context";
import { internalLinkPaths, internalLinkProtocol } from "../../constants";

interface EmptyViewProps {
  className?: string;
}

export const EmptyView: React.FC<EmptyViewProps> = (props) => {
  const { className } = props;

  const { tryHandleInternalLink } = useNotebookContext();

  const handleOnSelectScenario = useEventCallback(() => {
    tryHandleInternalLink?.(internalLinkProtocol + internalLinkPaths.scenarios);
  });

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <AppButton variant="link" onPress={handleOnSelectScenario}>
        <span className="mr-2 codicon codicon-link-external text-primary-600" />
        <FormattedMessage
          id="views.notebook.emptyView.selectScenario"
          defaultMessage="Select Scenario"
        />
      </AppButton>
    </div>
  );
};

import React, { useMemo, useRef } from "react";
import { Toolbar, ToolbarItem } from "../Toolbar";
import { useExperimentContext } from "./context";
import { useStore } from "zustand";
import { useIntl } from "react-intl";

interface ExperimentToolbarProps {
  className?: string;
}

export const ExperimentToolbar: React.FC<ExperimentToolbarProps> = (props) => {
  const { className } = props;
  const intl = useIntl();

  const ref = useRef<HTMLDivElement>(null);

  const { session, startSession, stopSession } = useExperimentContext();
  const sessionStatus = useStore(session.state, (s) => s.status);

  const leftItems = useMemo<ToolbarItem[]>(
    () => [
      sessionStatus === "idle" || sessionStatus === "disconnected"
        ? {
            key: "run",
            label: intl.formatMessage({
              id: "views.experiment.toolbar.run",
              defaultMessage: "Run",
            }),
            content: (
              <span className="text-green-800 codicon codicon-debug-start" />
            ),
            action: () => startSession(),
          }
        : {
            key: "stop",
            label: intl.formatMessage({
              id: "views.experiment.toolbar.stop",
              defaultMessage: "Stop",
            }),
            content: (
              <span className="text-red-800 codicon codicon-debug-stop" />
            ),
            action: () => stopSession(),
          },
    ],
    [intl, sessionStatus, startSession, stopSession],
  );

  return (
    <div ref={ref} className={className}>
      <Toolbar className="w-full h-full" left={leftItems} />
    </div>
  );
};

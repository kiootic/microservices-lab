import React, { useMemo, useRef } from "react";
import { Toolbar, ToolbarItem } from "../Toolbar";
import { useExperimentContext } from "./context";
import { useStore } from "zustand";

interface ExperimentToolbarProps {
  className?: string;
}

export const ExperimentToolbar: React.FC<ExperimentToolbarProps> = (props) => {
  const { className } = props;

  const ref = useRef<HTMLDivElement>(null);

  const { session, startSession, stopSession } = useExperimentContext();
  const sessionStatus = useStore(session.state, (s) => s.status);

  const leftItems = useMemo<ToolbarItem[]>(
    () => [
      {
        idle: {
          key: "run",
          label: "Run",
          content: (
            <span className="text-green-800 codicon codicon-debug-start" />
          ),
          action: () => startSession(),
        },
        running: {
          key: "stop",
          label: "Stop",
          content: <span className="text-red-800 codicon codicon-debug-stop" />,
          action: () => stopSession(),
        },
      }[sessionStatus],
    ],
    [sessionStatus, startSession, stopSession],
  );

  return (
    <div ref={ref} className={className}>
      <Toolbar className="w-full h-full" left={leftItems} />
    </div>
  );
};

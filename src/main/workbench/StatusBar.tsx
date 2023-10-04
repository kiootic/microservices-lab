import React, { useEffect, useMemo, useState } from "react";
import cn from "clsx";
import { useWorkbenchContext } from "./context";
import { useStore } from "zustand";
import { FormattedMessage } from "react-intl";
import { useEvent } from "../hooks/event-bus";
import styles from "./StatusBar.module.css";

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = (props) => {
  const { className } = props;

  const { internalState, events } = useWorkbenchContext();

  const statusBarItems = useStore(internalState, (s) => s.statusBarItems);

  const [saveState, setSaveState] = useState<
    "saving" | "failed" | "succeed" | null
  >(null);
  useEvent(events, "save", ({ state }) => {
    setSaveState(state);
  });
  useEffect(() => {
    if (saveState === "succeed") {
      const handle = setTimeout(() => setSaveState(null), 1000);
      return () => clearTimeout(handle);
    }
  }, [saveState]);

  const items = useMemo(() => {
    const items = Object.entries(statusBarItems).filter(
      ([, item]) => item != null,
    );

    let saveIcon: React.ReactElement | null = null;
    switch (saveState) {
      case "saving":
        saveIcon = (
          <span className={cn("w-10", styles["save-icon--pending"])}>
            <span className="codicon codicon-save" />
          </span>
        );
        break;
      case "failed":
        saveIcon = (
          <span className={cn("w-10", styles["save-icon--completed"])}>
            <span className="codicon codicon-save text-red-700" />
            <span className="codicon codicon-error ml-1 text-red-700" />
          </span>
        );
        break;
      case "succeed":
        saveIcon = (
          <span className={cn("w-10", styles["save-icon--completed"])}>
            <span className="codicon codicon-save text-green-700" />
            <span className="codicon codicon-check-all ml-1 text-green-700" />
          </span>
        );
        break;
      default:
        saveIcon = <span className="w-10" />;
        break;
    }
    items.unshift(["save", saveIcon]);

    return items;
  }, [statusBarItems, saveState]);

  return (
    <div className={cn("h-8 flex px-3 gap-x-3 text-sm border-t", className)}>
      {items.map(([key, item], i) => (
        <React.Fragment key={key}>
          {i !== 0 ? <div className="border-l-2 border-gray-300 my-2" /> : null}
          <div className="self-center">{item}</div>
        </React.Fragment>
      ))}
      <div className="border-l-2 border-gray-300 my-2 ml-auto" />
      <h1 className="self-center">
        <FormattedMessage id="app.name" defaultMessage="Microservices Lab" />
      </h1>
    </div>
  );
};

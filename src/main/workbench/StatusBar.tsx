import React, { useMemo } from "react";
import cn from "clsx";
import { useWorkbenchContext } from "./context";
import { useStore } from "zustand";
import { FormattedMessage } from "react-intl";

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = (props) => {
  const { className } = props;

  const { internalState } = useWorkbenchContext();
  const statusBarItems = useStore(internalState, (s) => s.statusBarItems);
  const items = useMemo(
    () => Object.entries(statusBarItems).filter(([, item]) => item != null),
    [statusBarItems],
  );

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

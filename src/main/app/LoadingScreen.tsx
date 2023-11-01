import React from "react";
import cn from "clsx";
import { FormattedMessage } from "react-intl";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="bg-gray-50 fixed inset-0">
      <div
        className={cn(
          "w-full h-full flex flex-col gap-8 items-center justify-center",
          "animate-loading",
        )}
      >
        <p className="text-lg font-medium relative px-4 w-24">
          <span className="absolute left-0 -translate-x-full scale-150 text-primary-800">
            <span className="codicon codicon-loading codicon-modifier-spin" />
          </span>
          <span className="animate-pulse">
            <FormattedMessage id="app.loading" defaultMessage="Loading..." />
          </span>
        </p>
      </div>
    </div>
  );
};

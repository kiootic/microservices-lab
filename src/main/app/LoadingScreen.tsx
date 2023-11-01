import React from "react";
import cn from "clsx";
import { FormattedMessage } from "react-intl";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="bg-gray-100 fixed inset-0">
      <div
        className={cn(
          "w-full h-full flex flex-col gap-8 items-center justify-center",
          "animate-fade-in",
        )}
      >
        <div
          className={cn(
            "w-8 h-8 border-4 rounded-full",
            "border-transparent border-l-primary-800 border-t-primary-800",
            "animate-spin",
          )}
        />
        <p className="text-lg font-medium animate-pulse">
          <FormattedMessage id="app.loading" defaultMessage="Loading..." />
        </p>
      </div>
    </div>
  );
};

import React from "react";
import { IntlProvider } from "react-intl";
import { WorkbenchHost } from "./WorkbenchHost";

export const App: React.FC = () => {
  return (
    <IntlProvider locale="en" defaultLocale="en">
      <WorkbenchHost />
    </IntlProvider>
  );
};

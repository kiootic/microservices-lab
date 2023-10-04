import React from "react";
import { IntlProvider } from "react-intl";
import { MainScreen } from "./MainScreen";

export const App: React.FC = () => {
  return (
    <IntlProvider locale="en" defaultLocale="en">
      <MainScreen />
    </IntlProvider>
  );
};

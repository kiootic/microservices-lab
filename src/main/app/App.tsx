import React, { Suspense } from "react";
import { IntlProvider } from "react-intl";
import { LoadingScreen } from "./LoadingScreen";

const MainScreenLoader = React.lazy(() =>
  import("./MainScreen").then((m) => ({ default: m.MainScreen })),
);

export const App: React.FC = () => {
  return (
    <IntlProvider locale="en" defaultLocale="en">
      <Suspense fallback={<LoadingScreen />}>
        <MainScreenLoader />
      </Suspense>
    </IntlProvider>
  );
};

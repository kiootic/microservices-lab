import { ExperimentUIState } from "../components/experiment/useExperiment";
import { internalLinkPaths } from "../constants";
import { useEvent } from "../hooks/event-bus";
import { WorkbenchContextValue } from "./context";

export function useLinkHandler(ctx: WorkbenchContextValue) {
  const { events, showView, state } = ctx;

  useEvent(events, "link", (e) => {
    switch (e.url.pathname) {
      case internalLinkPaths.metrics: {
        const experimentUIState: ExperimentUIState =
          state.getState().experimentUIState ?? {};
        state.setState({
          experimentUIState: {
            ...experimentUIState,
            metricQuery:
              e.url.searchParams.get("q") ?? experimentUIState.metricQuery,
          } satisfies ExperimentUIState,
        });

        showView("experiment");
        break;
      }

      case internalLinkPaths.scenarios: {
        showView("journal");
        break;
      }
    }
  });
}

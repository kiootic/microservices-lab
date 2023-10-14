import cn from "clsx";
import React, { useMemo } from "react";
import { AppComboBox } from "../AppComboBox";
import { useIntl } from "react-intl";
import { useExperimentContext } from "./context";
import { useStore } from "zustand";

interface MetricViewProps {
  className?: string;
}

export const MetricView: React.FC<MetricViewProps> = (props) => {
  const { className } = props;
  const intl = useIntl();

  const { session } = useExperimentContext();
  const metricNames = useStore(session.state, (s) => s.metricNames);
  const items = useMemo(
    () => metricNames.map((name) => ({ key: name })),
    [metricNames],
  );

  const metricState = AppComboBox.useState(items);

  return (
    <div className={cn("p-3", className)}>
      <AppComboBox
        className="font-mono mb-4"
        popoverClassName="font-mono text-sm"
        aria-label={intl.formatMessage({
          id: "views.experiment.metrics.metricName",
          defaultMessage: "Metric",
        })}
        menuTrigger="focus"
        allowsCustomValue={true}
        selectedKey={metricState.selectedKey}
        inputValue={metricState.inputValue}
        onSelectionChange={metricState.handleOnSelectionChange}
        onInputChange={metricState.handleOnInputChange}
        items={items}
      />
      <div className="h-72" />
    </div>
  );
};

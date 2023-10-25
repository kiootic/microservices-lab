import cn from "clsx";
import React, { useMemo, useState } from "react";
import { AppSelect } from "../AppSelect";
import { MetricView } from "./MetricView";
import { useExperimentContext } from "./context";
import { useStore } from "zustand";
import { useEventCallback } from "../../hooks/event-callback";
import { useIntl } from "react-intl";

interface MetricsBoxProps {
  className?: string;
}

export const MetricsBox: React.FC<MetricsBoxProps> = (props) => {
  const { className } = props;
  const intl = useIntl();

  const { session } = useExperimentContext();
  const metricOwnerKeys = useStore(session.state, (s) => s.metricOwnerKeys);
  const ownerKeyItems = useMemo(
    () =>
      metricOwnerKeys.length === 0
        ? [{ key: "", text: "-" }]
        : metricOwnerKeys.map((key) => ({ key, text: key === "" ? "-" : key })),
    [metricOwnerKeys],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const effectiveSelectedKey = selectedKey ?? metricOwnerKeys[0] ?? "";
  const handleOnSelectionChange = useEventCallback((key: React.Key) => {
    if (typeof key === "string") {
      setSelectedKey(key);
    }
  });

  return (
    <div className={cn(className)}>
      <div className="relative w-full h-full">
        <AppSelect
          className="absolute -top-7 right-0 w-1/2 border-none text-sm text-right font-medium"
          popoverClassName="text-sm text-right mr-8"
          aria-label={intl.formatMessage({
            id: "views.experiment.metrics.owner",
            defaultMessage: "Metric Owner",
          })}
          items={ownerKeyItems}
          selectedKey={effectiveSelectedKey}
          onSelectionChange={handleOnSelectionChange}
        />
        <MetricView className="w-full h-full" ownerKey={effectiveSelectedKey} />
      </div>
    </div>
  );
};

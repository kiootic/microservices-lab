import cn from "clsx";
import React, { useEffect, useMemo, useState } from "react";
import { AppComboBox } from "../AppComboBox";
import { useIntl } from "react-intl";
import { useExperimentContext } from "./context";
import { useStore } from "zustand";
import { MetricGraph } from "./MetricGraph";
import {
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
} from "../../../shared/comm";
import { useDebouncedValue } from "../../hooks/debounce";
import { parseSeries } from "../../utils/series";

const maxSeries = 10;

interface MetricViewProps {
  className?: string;
  ownerKey: string;
}

export const MetricView: React.FC<MetricViewProps> = (props) => {
  const { className, ownerKey } = props;
  const intl = useIntl();

  const { session, state } = useExperimentContext();
  const metricSampleCount = useStore(session.state, (s) => s.metricSampleCount);

  const [metricNames, setMetricNames] = useState<string[]>([]);

  const items = useMemo(
    () => metricNames.map((name) => ({ key: name })),
    [metricNames],
  );

  const metricQuery = useStore(state, (s) => s.metricQuery ?? "");
  const metricState = AppComboBox.useState(items, {
    inputValue: metricQuery,
    selectedKey: metricQuery,
  });

  const handleOnSelectionChange = metricState.handleOnSelectionChange;
  useEffect(() => {
    handleOnSelectionChange(metricQuery);
  }, [handleOnSelectionChange, metricQuery]);

  const metricName = useDebouncedValue(
    metricState.inputValue,
    metricState.selectedKey == null ? 200 : 0,
  );
  useEffect(() => {
    state.setState({ metricQuery: metricName });
  }, [state, metricName]);

  interface SeriesData {
    series: MetricsTimeSeries[];
    samples: MetricsTimeSeriesSamples[];
  }
  const [data, setData] = useState<SeriesData>({ series: [], samples: [] });

  useEffect(() => {
    let isDisposed = false;
    void session.getMetricNames(ownerKey).then((metricNames) => {
      if (isDisposed) {
        return;
      }
      setMetricNames(metricNames);
    });
    return () => {
      isDisposed = true;
    };
  }, [session, ownerKey, metricSampleCount]);

  useEffect(() => {
    const series = parseSeries(metricName);

    let isDisposed = false;
    void session
      .getMetrics(ownerKey, series.name, maxSeries, series.labels)
      .then((series) => {
        if (isDisposed) {
          return;
        }
        setData((d) => {
          let isSameSeries = d.series.length === series.length;
          if (isSameSeries) {
            for (let i = 0; i < series.length; i++) {
              isSameSeries &&= d.series[i].id === series[i].id;
            }
          }
          return { series, samples: isSameSeries ? d.samples : [] };
        });
      });
    return () => {
      isDisposed = true;
    };
  }, [ownerKey, session, metricName, metricSampleCount]);

  useEffect(() => {
    let isDisposed = false;
    void session
      .queryMetrics(
        ownerKey,
        data.series.map((s) => s.id),
      )
      .then((samples) => {
        if (isDisposed) {
          return;
        }
        setData((d) => ({ series: d.series, samples }));
      });
    return () => {
      isDisposed = true;
    };
  }, [session, ownerKey, data.series]);

  return (
    <div className={cn("p-3 flex flex-col", className)}>
      <AppComboBox
        className="flex-none font-mono mb-4"
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
      <MetricGraph
        className="flex-grow h-32"
        series={data.series}
        samples={data.samples}
      />
    </div>
  );
};

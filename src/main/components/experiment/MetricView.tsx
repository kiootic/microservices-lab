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
}

export const MetricView: React.FC<MetricViewProps> = (props) => {
  const { className } = props;
  const intl = useIntl();

  const { session, state } = useExperimentContext();
  const metricNames = useStore(session.state, (s) => s.metricNames);
  const metricSampleCount = useStore(session.state, (s) => s.metricSampleCount);
  const items = useMemo(
    () => metricNames.map((name) => ({ key: name })),
    [metricNames],
  );

  const metricState = AppComboBox.useState(items, {
    inputValue: state.getState().metricQuery,
    selectedKey: state.getState().metricQuery,
  });

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
    const series = parseSeries(metricName);

    let isDisposed = false;
    void session
      .getMetrics(series.name, maxSeries, series.labels)
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
  }, [session, metricName, metricSampleCount]);

  useEffect(() => {
    let isDisposed = false;
    void session.queryMetrics(data.series.map((s) => s.id)).then((samples) => {
      if (isDisposed) {
        return;
      }
      setData((d) => ({ series: d.series, samples }));
    });
    return () => {
      isDisposed = true;
    };
  }, [session, data.series]);

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

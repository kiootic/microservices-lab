import { MetricsTimeSeries } from "../../shared/comm";

export function formatSeries(series: MetricsTimeSeries): string {
  let text = series.name;
  const labels = Object.entries(series.labels)
    .map(([name, value]) => `${name}=${value}`)
    .join(", ");
  if (labels.length > 0) {
    text += `{${labels}}`;
  }
  return text;
}

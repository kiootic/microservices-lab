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

interface ParsedSeries {
  name: string;
  labels: Partial<Record<string, string>>;
}

export function parseSeries(text: string): ParsedSeries {
  let name = text;
  const labels: Partial<Record<string, string>> = {};

  const openBrace = text.indexOf("{");
  if (openBrace !== -1) {
    name = text.slice(0, openBrace);
    text = text.slice(openBrace + 1);

    let end;
    while ((end = /}|,/.exec(text)?.index) != null) {
      const label = text.slice(0, end);
      const eq = label.indexOf("=");
      if (eq != null) {
        const labelName = label.slice(0, eq);
        const labelValue = label.slice(eq + 1);
        labels[labelName.trim()] = labelValue.trim();
      }
      text = text.slice(end + 1);
    }
  }

  return { name: name.trim(), labels };
}

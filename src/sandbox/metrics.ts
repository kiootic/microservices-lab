import {
  WorkerMetricsPartitionState,
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
} from "../shared/comm";

const emptySamples: MetricsTimeSeriesSamples = {
  timestamps: new Float32Array(0),
  values: new Float32Array(0),
};

export class MetricsStore {
  private readonly series = new Map<number, MetricsTimeSeries>();
  private readonly samples: Float32Array[] = [];
  numSamples = 0;

  private readonly seriesIDs = new Map<string, number[]>();
  readonly metricNames: string[] = [];

  add(partition: WorkerMetricsPartitionState): void {
    this.samples[partition.sequence] = partition.samples;
    this.numSamples += partition.size;

    let needSort = false;
    for (const [id, meta] of partition.series) {
      this.series.set(id, {
        id,
        name: meta.name,
        labels: meta.labels,
        type: meta.type,
        numSamples: 0,
        min: Infinity,
        max: -Infinity,
        firstTimestamp: Infinity,
        lastTimestamp: -Infinity,
      });

      let seriesIDs = this.seriesIDs.get(meta.name);
      if (seriesIDs == null) {
        seriesIDs = [];
        this.seriesIDs.set(meta.name, seriesIDs);
        this.metricNames.push(meta.name);
        needSort = true;
      }
      seriesIDs.push(id);
    }

    if (needSort) {
      this.metricNames.sort();
    }

    this.process(partition.samples);
  }

  getMetrics(
    name: string,
    max?: number,
    labels?: Partial<Record<string, string>>,
  ): MetricsTimeSeries[] {
    return (this.seriesIDs.get(name) ?? [])
      .flatMap((id) => this.series.get(id) ?? [])
      .filter((series) => series.numSamples > 0)
      .filter((series) => {
        for (const [name, value] of Object.entries(labels ?? {})) {
          if (series.labels[name] !== value) {
            return false;
          }
        }
        return true;
      })
      .slice(0, max);
  }

  queryMetrics(ids: number[]): MetricsTimeSeriesSamples[] {
    return ids.map((id) => {
      const series = this.series.get(id);
      if (series == null) {
        return emptySamples;
      }

      const timestamps = new Float32Array(series.numSamples);
      const values = new Float32Array(series.numSamples);
      let i = 0;
      for (const samples of this.samples) {
        if (samples == null) {
          continue;
        }

        for (let j = 0; j < samples.length; j += 3) {
          const seriesID = samples[j + 0];
          if (seriesID !== id) {
            continue;
          }

          timestamps[i] = samples[j + 1];
          values[i] = samples[j + 2];
          i++;
        }
      }

      return { timestamps, values };
    });
  }

  private process(samples: Float32Array) {
    for (let i = 0; i < samples.length; i += 3) {
      const seriesID = samples[i + 0];
      const timestamp = samples[i + 1];
      const value = samples[i + 2];

      const series = this.series.get(seriesID);
      if (series == null) {
        continue;
      }

      series.numSamples++;
      series.min = Math.min(series.min, value);
      series.max = Math.max(series.max, value);
      series.firstTimestamp = Math.min(series.firstTimestamp, timestamp);
      series.lastTimestamp = Math.max(series.lastTimestamp, timestamp);
    }
  }
}

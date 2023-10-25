import {
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
  WorkerMetricsPartitionState,
  WorkerMetricsTimeSeriesMeta,
} from "../shared/comm";

const emptySamples: MetricsTimeSeriesSamples = {
  timestamps: new Float32Array(0),
  values: new Float32Array(0),
};

interface MetricsOwner {
  key: string;
  series: Map<number, MetricsTimeSeries>;
  metricNames: Set<string>;
  samples: Float32Array[];
}

export class MetricsStore {
  private readonly seriesMeta = new Map<number, WorkerMetricsTimeSeriesMeta>();
  private readonly owners = new Map<string, MetricsOwner>();
  numSamples = 0;

  private readonly seriesIDs = new Map<string, number[]>();

  add(partition: WorkerMetricsPartitionState): void {
    let owner = this.owners.get(partition.ownerKey);
    if (owner == null) {
      owner = {
        key: partition.ownerKey,
        series: new Map(),
        metricNames: new Set(),
        samples: [],
      };
      this.owners.set(owner.key, owner);
    }
    owner.samples[partition.sequence] = partition.samples;
    this.numSamples += partition.size;

    for (const [id, meta] of partition.series) {
      this.seriesMeta.set(id, meta);

      let seriesIDs = this.seriesIDs.get(meta.name);
      if (seriesIDs == null) {
        seriesIDs = [];
        this.seriesIDs.set(meta.name, seriesIDs);
      }
      seriesIDs.push(id);
    }

    this.process(owner, partition.samples);
  }

  getOwnerKeys(): string[] {
    return Array.from(this.owners.keys()).sort();
  }

  getMetricNames(ownerKey: string): string[] {
    const owner = this.owners.get(ownerKey);
    if (owner == null) {
      return [];
    }
    return Array.from(owner.metricNames).sort();
  }

  getMetrics(
    ownerKey: string,
    name: string,
    max?: number,
    labels?: Partial<Record<string, string>>,
  ): MetricsTimeSeries[] {
    const owner = this.owners.get(ownerKey);
    if (owner == null) {
      return [];
    }
    return (this.seriesIDs.get(name) ?? [])
      .flatMap((id) => owner.series.get(id) ?? [])
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

  queryMetrics(ownerKey: string, ids: number[]): MetricsTimeSeriesSamples[] {
    const owner = this.owners.get(ownerKey);
    return ids.map((id) => {
      if (owner == null) {
        return emptySamples;
      }

      const series = owner.series.get(id);
      if (series == null) {
        return emptySamples;
      }

      const timestamps = new Float32Array(series.numSamples);
      const values = new Float32Array(series.numSamples);
      let i = 0;
      for (const samples of owner.samples) {
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

  private process(owner: MetricsOwner, samples: Float32Array) {
    for (let i = 0; i < samples.length; i += 3) {
      const seriesID = samples[i + 0];
      const timestamp = samples[i + 1];
      const value = samples[i + 2];

      let series = owner.series.get(seriesID);
      if (series == null) {
        const meta = this.seriesMeta.get(seriesID);
        if (meta == null) {
          continue;
        }

        series = {
          id: seriesID,
          name: meta.name,
          labels: meta.labels,
          type: meta.type,
          numSamples: 0,
          min: Infinity,
          max: -Infinity,
          firstTimestamp: Infinity,
          lastTimestamp: -Infinity,
        };
        owner.series.set(seriesID, series);
        owner.metricNames.add(meta.name);
      }

      series.numSamples++;
      series.min = Math.min(series.min, value);
      series.max = Math.max(series.max, value);
      series.firstTimestamp = Math.min(series.firstTimestamp, timestamp);
      series.lastTimestamp = Math.max(series.lastTimestamp, timestamp);
    }
  }
}

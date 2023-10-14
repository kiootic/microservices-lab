import { MetricsPartitionState, MetricsTimeSeriesMeta } from "../shared/comm";

export class MetricsStore {
  private readonly seriesMetas = new Map<number, MetricsTimeSeriesMeta>();
  private readonly samples: Float32Array[] = [];
  numSamples = 0;

  private readonly seriesIDs = new Map<string, number[]>();
  readonly metricNames: string[] = [];

  add(partition: MetricsPartitionState): void {
    this.samples[partition.sequence] = partition.samples;
    this.numSamples += partition.size;

    let needSort = false;
    for (const [id, meta] of partition.series) {
      this.seriesMetas.set(id, meta);

      let seriesIDs = this.seriesIDs.get(meta.name);
      if (seriesIDs == null) {
        seriesIDs = [];
        this.seriesIDs.set(meta.name, []);
        this.metricNames.push(meta.name);
        needSort = true;
      }
      seriesIDs.push(id);
    }

    if (needSort) {
      this.metricNames.sort();
    }
  }
}

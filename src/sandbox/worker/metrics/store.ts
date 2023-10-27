import { WorkerMetricsPartitionState } from "../../../shared/comm";
import { Partition } from "./partition";

export type SeriesType = "counter" | "gauge" | "histogram";
export type SeriesLabels = Partial<Record<string, string>>;

interface SeriesMeta {
  name: string;
  labels: Partial<Record<string, string>>;
  type: SeriesType;
}

export class MetricsStore {
  private readonly now: () => number;
  private readonly flushPartition: (state: WorkerMetricsPartitionState) => void;

  private readonly seriesID = new Map<string, number>();
  private readonly series = new Map<number, SeriesMeta>();

  private readonly metricValues = new Map<number, number>();
  private sampleBufferTimestamp = 0;
  private readonly sampleBuffer = new Map<number, number>();

  private readonly partition = new Partition();
  private readonly partitionSeries = new Map<number, SeriesMeta>();
  private partitionSequence = 0;
  private numSamples = 0;

  private ownerKey = "";

  constructor(
    now: () => number,
    flushPartition: (state: WorkerMetricsPartitionState) => void,
  ) {
    this.now = now;
    this.flushPartition = flushPartition;
  }

  get timestamp(): number {
    return this.now();
  }

  updateMetric(id: number, updater: (x: number) => number): number {
    let value = this.metricValues.get(id) ?? 0;
    value = updater(value);
    this.metricValues.set(id, value);
    return value;
  }

  setOwnerKey(key: string) {
    this.flush();
    this.ownerKey = key;
  }

  addSeries(
    seriesType: SeriesType,
    name: string,
    labels: SeriesLabels,
  ): number {
    let key = name;
    for (const [name, value] of Object.entries(labels)) {
      key += `\0${name}\0${value}`;
    }

    let seriesID = this.seriesID.get(key);
    if (seriesID != null) {
      return seriesID;
    }

    seriesID = this.seriesID.size + 1;
    this.seriesID.set(key, seriesID);

    const meta: SeriesMeta = { type: seriesType, name, labels };
    this.series.set(seriesID, meta);
    this.partitionSeries.set(seriesID, meta);

    return seriesID;
  }

  private flushSampleBuffer() {
    for (const [seriesID, value] of this.sampleBuffer) {
      this.writeSample(seriesID, this.sampleBufferTimestamp, value);
    }
    this.sampleBuffer.clear();
  }

  bufferSample(seriesID: number, timestamp: number, value: number) {
    if (this.sampleBufferTimestamp !== timestamp) {
      this.flushSampleBuffer();
      this.sampleBufferTimestamp = timestamp;
    }

    this.sampleBuffer.set(seriesID, value);
  }

  writeSample(seriesID: number, timestamp: number, value: number) {
    if (this.sampleBufferTimestamp !== timestamp) {
      this.flushSampleBuffer();
      this.sampleBufferTimestamp = timestamp;
    }

    if (this.partition.isFull) {
      this.doFlushPartition();
    }

    const meta = this.series.get(seriesID);
    if (meta == null) {
      return;
    }

    this.partition.writeSample(seriesID, timestamp, value);
    this.numSamples++;
  }

  flush() {
    this.flushSampleBuffer();
    this.doFlushPartition();
  }

  private doFlushPartition() {
    if (this.partition.count === 0) {
      return;
    }

    this.flushPartition({
      ownerKey: this.ownerKey,
      sequence: this.partitionSequence,
      size: this.partition.count,
      samples: this.partition.getSamples(),
      series: this.partitionSeries,
    });

    this.partition.clear();
    this.partitionSeries.clear();
    this.partitionSequence++;
  }
}

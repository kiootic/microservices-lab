import { MetricsStore, SeriesLabels, SeriesType } from "./store";

abstract class Metric {
  protected readonly store: MetricsStore;
  protected readonly name: string;
  protected readonly labels: SeriesLabels;
  protected readonly id: number;

  constructor(
    type: SeriesType,
    store: MetricsStore,
    name: string,
    labels: SeriesLabels,
  ) {
    this.store = store;
    this.name = name;
    this.labels = labels;
    this.id = store.addSeries(type, name, labels);
  }
}

type MetricConstructor<T extends Metric> = new (
  store: MetricsStore,
  name: string,
  labels: SeriesLabels,
) => T;

export class Vec<T extends Metric> {
  private readonly store: MetricsStore;
  private readonly name: string;
  private readonly labels: SeriesLabels;
  private readonly labelName: string;
  private readonly Type: MetricConstructor<T>;
  private readonly metrics = new Map<string, T>();

  constructor(
    store: MetricsStore,
    name: string,
    labels: SeriesLabels,
    labelName: string,
    Type: MetricConstructor<T>,
  ) {
    this.store = store;
    this.name = name;
    this.labels = labels;
    this.labelName = labelName;
    this.Type = Type;
  }

  get(labelValue: string): T {
    let metric = this.metrics.get(labelValue);
    if (metric == null) {
      metric = new this.Type(this.store, this.name, {
        ...this.labels,
        [this.labelName]: labelValue,
      });
      this.metrics.set(labelValue, metric);
    }
    return metric;
  }
}

export class Counter extends Metric {
  constructor(store: MetricsStore, name: string, labels: SeriesLabels) {
    super("counter", store, name, labels);
  }

  withLabels(labels: SeriesLabels): Counter {
    return new Counter(this.store, this.name, { ...this.labels, ...labels });
  }

  vec(labelName: string): Vec<Counter> {
    return new Vec(this.store, this.name, this.labels, labelName, Counter);
  }

  add(increase: number) {
    const value = this.store.updateMetric(this.id, (x) => x + increase);
    this.store.bufferSample(this.id, this.store.timestamp, value);
  }

  increment() {
    this.add(1);
  }
}

export class Gauge extends Metric {
  constructor(store: MetricsStore, name: string, labels: SeriesLabels) {
    super("gauge", store, name, labels);
  }

  withLabels(labels: SeriesLabels): Gauge {
    return new Gauge(this.store, this.name, { ...this.labels, ...labels });
  }

  vec(labelName: string): Vec<Gauge> {
    return new Vec(this.store, this.name, this.labels, labelName, Gauge);
  }

  set(value: number) {
    this.store.updateMetric(this.id, () => value);
    this.store.bufferSample(this.id, this.store.timestamp, value);
  }

  add(increase: number) {
    const value = this.store.updateMetric(this.id, (x) => x + increase);
    this.store.bufferSample(this.id, this.store.timestamp, value);
  }

  subtract(decrease: number) {
    const value = this.store.updateMetric(this.id, (x) => x - decrease);
    this.store.bufferSample(this.id, this.store.timestamp, value);
  }

  increment() {
    const value = this.store.updateMetric(this.id, (x) => x + 1);
    this.store.bufferSample(this.id, this.store.timestamp, value);
  }

  decrement() {
    const value = this.store.updateMetric(this.id, (x) => x - 1);
    this.store.bufferSample(this.id, this.store.timestamp, value);
  }
}

export class Histogram extends Metric {
  constructor(store: MetricsStore, name: string, labels: SeriesLabels) {
    super("histogram", store, name, labels);
  }

  withLabels(labels: SeriesLabels): Histogram {
    return new Histogram(this.store, this.name, { ...this.labels, ...labels });
  }

  vec(labelName: string): Vec<Histogram> {
    return new Vec(this.store, this.name, this.labels, labelName, Histogram);
  }

  observe(value: number) {
    this.store.writeSample(this.id, this.store.timestamp, value);
  }
}

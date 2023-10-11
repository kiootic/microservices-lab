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
  private value = 0;

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
    this.value += increase;
    this.store.writeSample(this.id, this.store.timestamp, this.value);
  }

  increment() {
    this.add(1);
  }
}

export class Gauge extends Metric {
  private value = 0;

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
    this.value = value;
    this.store.writeSample(this.id, this.store.timestamp, this.value);
  }

  add(increase: number) {
    this.set(this.value + increase);
  }

  subtract(decrease: number) {
    this.set(this.value - decrease);
  }

  increment() {
    this.set(this.value + 1);
  }

  decrement() {
    this.set(this.value - 1);
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

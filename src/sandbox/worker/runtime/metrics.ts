import { Counter, Gauge, Histogram } from "../metrics/metrics";
import { MetricsStore, SeriesLabels } from "../metrics/store";
import { Host } from "./host";
import { Scheduler } from "./scheduler";
import { Zone } from "./zone";

export interface MetricsFactory {
  counter: (name: string, labels?: SeriesLabels) => Counter;
  gauge: (name: string, labels?: SeriesLabels) => Gauge;
  histogram: (name: string, labels?: SeriesLabels) => Histogram;
}

export class MetricsManager {
  private readonly host: Host;
  readonly store: MetricsStore;

  readonly factory: MetricsFactory = {
    counter: (name, labels = {}) => new Counter(this.store, name, labels),
    gauge: (name, labels = {}) => new Gauge(this.store, name, labels),
    histogram: (name, labels = {}) => new Histogram(this.store, name, labels),
  };

  constructor(host: Host, scheduler: Scheduler) {
    this.host = host;
    this.store = new MetricsStore(
      () => scheduler.currentTime,
      (state) => Zone.runOutside(() => this.host.writePartition(state)),
    );
  }

  dispose() {
    this.store.flush();
  }
}

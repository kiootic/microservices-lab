import { Counter, Gauge, Histogram } from "../metrics/metrics";
import { MetricsStore, SeriesLabels } from "../metrics/store";
import { Host } from "./host";
import { Scheduler } from "./scheduler";

export class MetricsManager {
  private readonly host: Host;
  readonly store: MetricsStore;

  readonly factory = {
    counter: (name: string, labels: SeriesLabels = {}) =>
      new Counter(this.store, name, labels),

    gauge: (name: string, labels: SeriesLabels = {}) =>
      new Gauge(this.store, name, labels),

    histogram: (name: string, labels: SeriesLabels = {}) =>
      new Histogram(this.store, name, labels),
  };

  constructor(host: Host, scheduler: Scheduler) {
    this.host = host;
    this.store = new MetricsStore(
      () => scheduler.currentTime,
      (state) => this.host.writePartition(state),
    );
  }

  dispose() {
    this.store.flush();
  }
}

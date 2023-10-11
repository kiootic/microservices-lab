export class Partition {
  static readonly size = 0x10000;

  private readonly samples = new Float32Array(Partition.size * 3);
  count = 0;

  get isFull() {
    return this.count === Partition.size;
  }

  clear() {
    this.count = 0;
  }

  writeSample(seriesID: number, timestamp: number, value: number) {
    this.samples[this.count * 3 + 0] = seriesID;
    this.samples[this.count * 3 + 1] = timestamp;
    this.samples[this.count * 3 + 2] = value;
    this.count++;
  }

  getSamples() {
    return this.samples.subarray(0, this.count * 3);
  }
}

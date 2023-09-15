export interface ServiceModule {
  instance: (hostID: number) => Record<string, unknown>;
}

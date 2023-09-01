export class ServiceUnavailableError extends Error {
  readonly name = "ServiceUnavailableError";

  readonly service: string;

  constructor(service: string) {
    super(`Service '${service}' is unavailable`);
    this.service = service;
  }
}

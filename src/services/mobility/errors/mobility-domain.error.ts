export class MobilityDomainError extends Error {
  readonly code: string;

  constructor(
    message: string,
    code: string
  ) {
    super(message);
    this.name = "MobilityDomainError";
    this.code = code;
  }
}

export class DispatchDomainError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "DispatchDomainError";
    this.code = code;
  }
}

// Domain / application errors.
export class DomainError extends Error {
  constructor(message: string, public readonly code: string = "domain_error") {
    super(message);
    this.name = "DomainError";
  }
}

export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string = "application_error",
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class ValidationError extends Error {
  public readonly details: string[];

  constructor(details: string[], message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProviderError extends Error {
  public readonly provider: string;
  public readonly code: string;
  public readonly retryable: boolean;
  public override readonly cause?: unknown;

  constructor(params: {
    provider: string;
    code: string;
    message: string;
    retryable: boolean;
    cause?: unknown;
  }) {
    super(params.message, params.cause !== undefined ? { cause: params.cause } : undefined);
    this.name = "ProviderError";
    this.provider = params.provider;
    this.code = params.code;
    this.retryable = params.retryable;
    this.cause = params.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, message = "Provider rate limit exceeded", cause?: unknown) {
    super({
      provider,
      code: "RATE_LIMIT",
      message,
      retryable: true,
      cause
    });
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TimeoutError extends ProviderError {
  constructor(provider: string, message = "Provider request timed out", cause?: unknown) {
    super({
      provider,
      code: "TIMEOUT",
      message,
      retryable: true,
      cause
    });
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

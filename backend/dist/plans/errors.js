export class ValidationError extends Error {
    details;
    constructor(details, message = "Validation failed") {
        super(message);
        this.name = "ValidationError";
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class ProviderError extends Error {
    provider;
    code;
    retryable;
    cause;
    constructor(params) {
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
    constructor(provider, message = "Provider rate limit exceeded", cause) {
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
    constructor(provider, message = "Provider request timed out", cause) {
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

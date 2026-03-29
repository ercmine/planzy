export declare class ValidationError extends Error {
    readonly details: string[];
    constructor(details: string[], message?: string);
}
export declare class ProviderError extends Error {
    readonly provider: string;
    readonly code: string;
    readonly retryable: boolean;
    readonly cause?: unknown;
    constructor(params: {
        provider: string;
        code: string;
        message: string;
        retryable: boolean;
        cause?: unknown;
    });
}
export declare class RateLimitError extends ProviderError {
    constructor(provider: string, message?: string, cause?: unknown);
}
export declare class TimeoutError extends ProviderError {
    constructor(provider: string, message?: string, cause?: unknown);
}

export type GeocodingErrorCode = "invalid_input" | "provider_unavailable" | "timeout" | "malformed_response" | "no_results";
export declare class GeocodingError extends Error {
    readonly code: GeocodingErrorCode;
    readonly statusCode: number;
    constructor(code: GeocodingErrorCode, message: string, statusCode: number);
}

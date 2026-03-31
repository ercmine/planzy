export interface GeoClientConfig {
    enabled: boolean;
    baseUrl?: string;
    timeoutMs: number;
    retries: number;
    authSecret?: string;
    failOpen: boolean;
}
export interface GeoLocalConfig {
    nominatimBaseUrl?: string;
    timeoutMs: number;
    geocodeCacheTtlMs: number;
    reverseCacheTtlMs: number;
    defaultLimit: number;
    userAgent: string;
}
export interface GeoRuntimeConfig {
    client: GeoClientConfig;
    local: GeoLocalConfig;
}
export interface GeoRuntimeValidation {
    mode: "custom" | "nominatim" | "disabled";
    reason: string;
    shouldFailFast: boolean;
    errors: string[];
    warnings: string[];
}
export declare function readGeoRuntimeConfig(env: NodeJS.ProcessEnv): GeoRuntimeConfig;
export declare function validateGeoRuntimeConfig(config: GeoRuntimeConfig, env: NodeJS.ProcessEnv): GeoRuntimeValidation;

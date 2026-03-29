export interface GeocodingCache {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T, ttlMs: number): void;
}
export declare class MemoryGeocodingCache implements GeocodingCache {
    private readonly now;
    private readonly entries;
    constructor(now?: () => number);
    get<T>(key: string): T | null;
    set<T>(key: string, value: T, ttlMs: number): void;
}

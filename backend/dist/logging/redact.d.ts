export declare function stripQuery(url: string): string;
export declare function coarseGeo(lat: number, lng: number): {
    cell: string;
};
export declare function hashString(input: string): string;
export declare function safeTextHint(input: unknown, maxLen?: number): string | undefined;
export declare function redactObject(obj: Record<string, unknown>): Record<string, unknown>;

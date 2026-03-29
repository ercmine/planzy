export declare function normalizeWhitespace(value: string): string;
export declare function normalizeDisplayName(value: string): string;
export declare function normalizeComparisonName(value: string): string;
export declare function normalizePhone(value?: string): string | undefined;
export declare function normalizeUrl(value?: string): string | undefined;
export declare function extractWebsiteDomain(value?: string): string | undefined;
export declare function normalizeAddressComparison(input: {
    formattedAddress?: string;
    address1?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
}): string;
export declare function stableHash(value: unknown): string;
export declare function buildSlug(name: string, idSuffix: string): string;
export declare function geohashLite(lat: number, lng: number): string;
export declare function jaccardSimilarity(a: string, b: string): number;

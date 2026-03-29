export interface RouterCursorV2 {
    v: 2;
    offset: number;
    batchSize: number;
    deckKey?: string;
    createdAtMs: number;
}
export declare function encodeBase64Url(str: string): string;
export declare function decodeBase64Url(b64: string): string;
export declare function encodeCursor(c: RouterCursorV2): string;
export declare function decodeCursor(cursor: string): RouterCursorV2 | null;
export declare function validateCursor(c: RouterCursorV2, nowMs: number, opts?: {
    maxAgeMs?: number;
    maxOffset?: number;
}): RouterCursorV2;

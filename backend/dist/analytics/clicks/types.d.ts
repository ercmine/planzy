export type LinkType = "maps" | "website" | "call" | "booking" | "ticket";
export interface OutboundClickInput {
    sessionId: string;
    planId: string;
    linkType: LinkType;
    userId?: string;
    atISO?: string;
    meta?: {
        campaign?: string;
        provider?: string;
        source?: string;
        extra?: Record<string, string | number | boolean | null>;
    };
}
export interface OutboundClickRecord {
    clickId: string;
    sessionId: string;
    planId: string;
    linkType: LinkType;
    userId?: string;
    serverAtISO: string;
    clientAtISO?: string;
    meta?: OutboundClickInput["meta"];
}
export interface ListClicksOptions {
    limit?: number;
    cursor?: string | null;
    linkType?: LinkType;
    planId?: string;
}
export interface ListClicksOptionsNormalized {
    limit: number;
    cursor: string | null;
    linkType?: LinkType;
    planId?: string;
}
export interface ListClicksResult {
    clicks: OutboundClickRecord[];
    nextCursor?: string | null;
}
export interface ClickAggregate {
    byLinkType: Record<LinkType, number>;
    total: number;
}

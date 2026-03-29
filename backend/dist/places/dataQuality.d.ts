import type { CanonicalPlace, PlaceSourceRecord } from "./types.js";
export type PlaceDataQualityIssueType = "sync_failure" | "missing_photos" | "blank_description" | "category_drift" | "duplicate_place" | "stale_record";
export type PlaceDataQualityIssueSeverity = "low" | "medium" | "high" | "critical";
export type PlaceDataQualityIssueStatus = "open" | "acknowledged" | "resolved" | "ignored";
export interface PlaceDataQualityIssue {
    id: string;
    issueKey: string;
    issueType: PlaceDataQualityIssueType;
    placeId: string;
    severity: PlaceDataQualityIssueSeverity;
    status: PlaceDataQualityIssueStatus;
    confidence?: number;
    provider?: string;
    city?: string;
    category?: string;
    detectedAt: string;
    lastSeenAt: string;
    resolvedAt?: string;
    resolvedBy?: string;
    adminNote?: string;
    evidence: Record<string, unknown>;
}
export interface PlaceDataQualityConfig {
    staleHoursDefault: number;
    staleHoursHighPriority: number;
    syncFailureRetryThreshold: number;
    minPhotosDefault: number;
    minPhotosByCategory: Record<string, number>;
    placeholderDescriptions: string[];
    categoryDriftMinConfidence: number;
    duplicateConfidenceThreshold: number;
    duplicateRadiusKm: number;
}
export interface PlaceQualityFilters {
    issueType?: PlaceDataQualityIssueType;
    severity?: PlaceDataQualityIssueSeverity;
    status?: PlaceDataQualityIssueStatus;
    provider?: string;
    city?: string;
    category?: string;
    placeId?: string;
}
export declare class PlaceDataQualityService {
    private readonly config;
    private readonly now;
    private readonly issuesByKey;
    constructor(config?: PlaceDataQualityConfig, now?: () => number);
    evaluate(places: CanonicalPlace[], sourceRecords: PlaceSourceRecord[]): PlaceDataQualityIssue[];
    listIssues(filters?: PlaceQualityFilters, page?: number, pageSize?: number): {
        total: number;
        items: PlaceDataQualityIssue[];
    };
    getIssue(issueId: string): PlaceDataQualityIssue | undefined;
    summarize(): {
        totalOpen: number;
        byType: {
            key: string;
            count: number;
        }[];
        bySeverity: {
            key: string;
            count: number;
        }[];
        byProvider: {
            key: string;
            count: number;
        }[];
        byCity: {
            key: string;
            count: number;
        }[];
        byCategory: {
            key: string;
            count: number;
        }[];
        hotspots: {
            key: string;
            count: number;
        }[];
    };
    getPlaceSummary(placeId: string): {
        placeId: string;
        openIssues: PlaceDataQualityIssue[];
        allIssues: PlaceDataQualityIssue[];
    };
    getProviderSummary(): {
        provider: string;
        total: number;
        open: number;
        byType: Record<string, number>;
    }[];
    updateIssueStatus(issueId: string, status: PlaceDataQualityIssueStatus, actorUserId: string, note?: string): {
        before: PlaceDataQualityIssue;
        after: PlaceDataQualityIssue;
    } | undefined;
    private mergeIssue;
    private detectForPlace;
    private detectDuplicates;
    private buildIssue;
}
export declare function createPlaceDataQualityConfigFromEnv(env?: NodeJS.ProcessEnv): PlaceDataQualityConfig;

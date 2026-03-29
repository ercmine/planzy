import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { CollectionActivityEvent, CollectionDefinition, CollectionDetailDto, CollectionStore, CollectionSummaryDto } from "./types.js";
export declare class CollectionsService {
    private readonly store;
    private readonly analytics?;
    private readonly notifications?;
    constructor(store: CollectionStore, analytics?: AnalyticsService | undefined, notifications?: NotificationService | undefined);
    listAvailableCollections(userId: string): CollectionSummaryDto[];
    getCollectionDetail(userId: string, collectionId: string): CollectionDetailDto | null;
    upsertDefinition(definition: CollectionDefinition): CollectionDefinition;
    recordActivity(event: CollectionActivityEvent): Promise<{
        updated: string[];
        completed: string[];
        ignored: boolean;
    }>;
    private toSummary;
    private resolveMembers;
    private matchesRule;
    private isCompleted;
    private passesGate;
    private passesModerationGate;
}

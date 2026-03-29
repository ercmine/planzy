import type { AccountsService } from "../accounts/service.js";
import { UserRole, UserStatus } from "../accounts/types.js";
import type { CreatorVerificationService } from "../creatorVerification/service.js";
import type { ModerationService } from "../moderation/service.js";
import type { ModerationDecisionType, ModerationTargetRef } from "../moderation/types.js";
import { type PlaceDataQualityIssueStatus } from "../places/dataQuality.js";
import type { PlaceNormalizationService } from "../places/service.js";
import type { PlaceStatus } from "../places/types.js";
import type { ReviewsStore } from "../reviews/store.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";
import type { AdminActionAudit, CurationStatus, FeaturedCityEntry, FeaturedCreatorEntry, FeaturedPlaceEntry, LaunchCollection, LaunchCollectionItem, LaunchReadinessStatus, ManualBoostRule, SourceHealthReviewItem } from "./types.js";
export interface AdminServiceDeps {
    accountsService: AccountsService;
    moderationService: ModerationService;
    creatorVerificationService?: CreatorVerificationService;
    venueClaimsService?: VenueClaimsService;
    placeService?: PlaceNormalizationService;
    subscriptionService?: SubscriptionService;
    reviewsStore?: ReviewsStore;
}
export declare class AdminService {
    private readonly deps;
    private readonly audit;
    private readonly qualityService;
    private readonly maintenanceService;
    private readonly featuredCreators;
    private readonly featuredPlaces;
    private readonly featuredCities;
    private readonly manualBoostRules;
    private readonly launchCollections;
    private readonly sourceHealthReviews;
    constructor(deps: AdminServiceDeps);
    getRolesForUser(userId: string): UserRole[];
    getOverview(): Promise<{
        users: {
            total: number;
            suspended: number;
            flagged: number;
        };
        creators: {
            total: number;
            pendingVerification: number;
            restricted: number;
        };
        businesses: {
            total: number;
            verified: number;
            pendingClaims: number;
        };
        moderation: {
            queueItems: number;
            openReports: number;
            urgentReports: number;
        };
        sourceHealth: {
            providers: never[];
            staleSources: number;
            mergeAnomalies: number;
            lowConfidenceMappings: number;
            missingMedia?: undefined;
            missingDescriptions?: undefined;
        } | {
            providers: {
                provider: string;
                total: number;
                stale: number;
                lastSyncAt?: string;
            }[];
            staleSources: number;
            mergeAnomalies: number;
            lowConfidenceMappings: number;
            missingMedia: number;
            missingDescriptions: number;
        };
        placeQuality: {
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
        subscriptions: {
            total: number;
            active: number;
            trialing: number;
            grace: number;
            mismatches: number;
        };
        ads: {
            adEnabledAudience: number;
            adFreeAudience: number;
            entitlementMismatches: number;
        };
        curation: {
            featuredCreatorsActive: number;
            featuredPlacesActive: number;
            featuredCitiesActive: number;
            activeBoosts: number;
            launchCollectionsActive: number;
            expiringSoon: {
                creators: number;
                places: number;
                cities: number;
                boosts: number;
            };
        };
        recentAdminActions: AdminActionAudit[];
    }>;
    listUsers(query: {
        search?: string;
        status?: UserStatus;
        role?: UserRole;
        limit?: number;
        offset?: number;
    }): {
        total: number;
        items: import("../accounts/types.js").UserIdentity[];
    };
    getSubscriptionOps(): {
        summary: {
            total: number;
            active: number;
            trialing: number;
            grace: number;
            mismatches: number;
        };
        items: {
            subscription: import("../subscriptions/types.js").Subscription;
            entitlementsMismatch: boolean;
            adsEnabled: import("../subscriptions/types.js").EntitlementValue;
        }[];
    };
    getAdsOps(): {
        summary: {
            adEnabledAudience: number;
            adFreeAudience: number;
            entitlementMismatches: number;
        };
        items: {
            subscription: import("../subscriptions/types.js").Subscription;
            entitlementsMismatch: boolean;
            adsEnabled: import("../subscriptions/types.js").EntitlementValue;
        }[];
    };
    getSourceHealth(): {
        providers: never[];
        staleSources: number;
        mergeAnomalies: number;
        lowConfidenceMappings: number;
        missingMedia?: undefined;
        missingDescriptions?: undefined;
    } | {
        providers: {
            provider: string;
            total: number;
            stale: number;
            lastSyncAt?: string;
        }[];
        staleSources: number;
        mergeAnomalies: number;
        lowConfidenceMappings: number;
        missingMedia: number;
        missingDescriptions: number;
    };
    refreshPlaceQualityIssues(): import("../places/dataQuality.js").PlaceDataQualityIssue[];
    getPlaceQualityOverview(): {
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
    listPlaceQualityIssues(filter: {
        issueType?: string;
        severity?: string;
        status?: string;
        provider?: string;
        city?: string;
        category?: string;
        placeId?: string;
        page?: number;
        pageSize?: number;
    }): {
        total: number;
        items: import("../places/dataQuality.js").PlaceDataQualityIssue[];
    };
    getPlaceQualityIssue(issueId: string): import("../places/dataQuality.js").PlaceDataQualityIssue | undefined;
    getPlaceQualitySummary(placeId: string): {
        placeId: string;
        openIssues: import("../places/dataQuality.js").PlaceDataQualityIssue[];
        allIssues: import("../places/dataQuality.js").PlaceDataQualityIssue[];
    };
    getProviderQualitySummary(): {
        provider: string;
        total: number;
        open: number;
        byType: Record<string, number>;
    }[];
    updatePlaceQualityIssueStatus(input: {
        actorUserId: string;
        issueId: string;
        status: PlaceDataQualityIssueStatus;
        note?: string;
    }): import("../places/dataQuality.js").PlaceDataQualityIssue | undefined;
    listBusinessClaims(filter: {
        status?: string;
        limit?: number;
    }): Promise<import("../index.js").ListClaimsResult | {
        total: number;
        items: never[];
    }>;
    importProviderPlaceForQuality(input: {
        provider: string;
        rawPayload: unknown;
        sourceUrl?: string;
        fetchedAt?: string;
        importBatchId?: string;
        syncRunId?: string;
    }): import("../places/types.js").ImportProviderPlaceResult | undefined;
    listPlaces(filter: {
        status?: PlaceStatus;
        minCategoryConfidence?: number;
        limit?: number;
        offset?: number;
    }): {
        total: number;
        items: import("../places/types.js").CanonicalPlace[];
    };
    detectPlaceDuplicateCandidates(): import("../places/types.js").DuplicateCandidate[];
    listPlaceDuplicateCandidates(status?: string): import("../places/types.js").DuplicateCandidate[];
    reviewPlaceDuplicateCandidate(input: {
        actorUserId: string;
        candidateId: string;
        status: "approved" | "rejected";
        note?: string;
    }): import("../places/types.js").DuplicateCandidate | undefined;
    mergeCanonicalPlaces(input: {
        actorUserId: string;
        targetPlaceId: string;
        sourcePlaceIds: string[];
        reason?: string;
        allowFarDistance?: boolean;
    }): import("../places/types.js").CanonicalPlace | undefined;
    correctCanonicalPlace(input: {
        actorUserId: string;
        placeId: string;
        reason: string;
        note?: string;
        updates: Record<string, unknown>;
    }): {
        geohash: string;
        manualOverrides: {
            canonicalSubcategory?: string | undefined;
            canonicalCategory?: string | undefined;
            primaryDisplayName?: string | undefined;
            descriptionCandidateId?: string | undefined;
            primaryPhotoId?: string | undefined;
        };
        lastNormalizedAt: string;
        latitude: number;
        longitude: number;
        region?: string;
        status: PlaceStatus;
        locality?: string;
        formattedAddress?: string;
        canonicalCategory: string;
        canonicalSubcategory?: string;
        primaryDisplayName: string;
        canonicalPlaceId: string;
        slug: string;
        mergedIntoPlaceId?: string;
        alternateNames: string[];
        address1?: string;
        address2?: string;
        postalCode?: string;
        countryCode?: string;
        neighborhood?: string;
        providerCategories: string[];
        tags: string[];
        cuisineTags: string[];
        vibeTags: string[];
        phone?: string;
        websiteUrl?: string;
        reservationUrl?: string;
        menuUrl?: string;
        orderingUrl?: string;
        bookingUrl?: string;
        socialLinks: Record<string, string>;
        shortDescription?: string;
        longDescription?: string;
        descriptionStatus: import("../places/types.js").DescriptionStatus;
        descriptionSourceType?: import("../places/types.js").PlaceDescriptionCandidate["sourceType"];
        descriptionSourceProvider?: string;
        descriptionSourceAttribution?: string;
        descriptionConfidence: number;
        descriptionGeneratedAt?: string;
        descriptionVersion: number;
        descriptionLanguage?: string;
        descriptionGenerationMethod?: import("../places/types.js").PlaceDescriptionCandidate["generationMethod"];
        alternateDescriptions: import("../places/types.js").PlaceDescriptionCandidate[];
        descriptionProvenance: Array<{
            candidateId: string;
            provider?: string;
            sourceRecordId?: string;
            sourceType: import("../places/types.js").DescriptionSourceType;
        }>;
        aiGeneratedDescription: boolean;
        editorialDescription: boolean;
        descriptionCandidates: import("../places/types.js").PlaceDescriptionCandidate[];
        primaryPhoto?: import("../places/types.js").CanonicalPhoto;
        photoGallery: import("../places/types.js").CanonicalPhoto[];
        providerPhotoRefs: Array<{
            provider: string;
            providerPhotoRef: string;
            sourceRecordId: string;
        }>;
        timezone?: string;
        openNow?: boolean;
        normalizedHours: Record<string, Array<{
            opens: string;
            closes: string;
        }>>;
        rawHoursText: string[];
        dataCompletenessScore: number;
        mergeConfidence: number;
        categoryConfidence: number;
        geocodeConfidence: number;
        permanentlyClosed: boolean;
        temporarilyClosed: boolean;
        sourceLinks: import("../places/types.js").CanonicalPlaceSourceLink[];
        sourceRecordIds: string[];
        fieldAttribution: import("../places/types.js").PlaceFieldAttribution[];
        firstSeenAt: string;
        lastSeenAt: string;
        lastMergedAt: string;
    } | undefined;
    reassignPlaceAttachment(input: {
        actorUserId: string;
        linkId: string;
        toPlaceId: string;
        reason: string;
    }): import("../places/types.js").PlaceAttachmentLink | undefined;
    listPlaceMaintenanceAudits(placeId?: string): import("../places/types.js").PlaceMaintenanceAuditEntry[];
    getModerationQueue(filter: {
        targetType?: ModerationTargetRef["targetType"];
        state?: string;
        severity?: string;
        limit?: number;
    }): import("../moderation/types.js").ModerationQueueItem[];
    getTargetModeration(target: ModerationTargetRef): {
        aggregate: import("../moderation/types.js").ModerationAggregate;
        reports: import("../moderation/types.js").ContentReport[];
        signals: import("../moderation/types.js").ModerationSignal[];
        decisions: import("../moderation/types.js").ModerationDecision[];
        audits: import("../moderation/types.js").ModerationAuditEvent[];
        alerts: import("../moderation/types.js").ModerationAlertRecord[];
    };
    applyModerationAction(input: {
        actorUserId: string;
        target: ModerationTargetRef;
        decisionType: ModerationDecisionType;
        reasonCode: string;
        notes?: string;
    }): Promise<{
        decision: import("../moderation/types.js").ModerationDecision;
        before: import("../moderation/types.js").ModerationAggregate;
        after: import("../moderation/types.js").ModerationAggregate;
    }>;
    suspendUser(input: {
        actorUserId: string;
        userId: string;
        reason: string;
        note?: string;
    }): import("../accounts/types.js").UserIdentity;
    reinstateUser(input: {
        actorUserId: string;
        userId: string;
        reason: string;
        note?: string;
    }): import("../accounts/types.js").UserIdentity;
    private nowIso;
    private isActiveWindow;
    private getCreatorTrustWarning;
    private getPlaceModerationWarning;
    private getCurationOpsSummary;
    listFeaturedCreators(filter?: {
        status?: CurationStatus;
        city?: string;
        categoryId?: string;
        activeNow?: boolean;
        q?: string;
    }): FeaturedCreatorEntry[];
    upsertFeaturedCreator(input: Omit<FeaturedCreatorEntry, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "trustWarning"> & {
        id?: string;
        actorUserId: string;
    }): FeaturedCreatorEntry;
    removeFeaturedCreator(input: {
        id: string;
        actorUserId: string;
        reason: string;
        note?: string;
    }): FeaturedCreatorEntry | undefined;
    listFeaturedPlaces(filter?: {
        status?: CurationStatus;
        city?: string;
        categoryId?: string;
        activeNow?: boolean;
    }): FeaturedPlaceEntry[];
    upsertFeaturedPlace(input: Omit<FeaturedPlaceEntry, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "moderationWarning"> & {
        id?: string;
        actorUserId: string;
    }): FeaturedPlaceEntry;
    removeFeaturedPlace(input: {
        id: string;
        actorUserId: string;
        reason: string;
        note?: string;
    }): FeaturedPlaceEntry | undefined;
    listFeaturedCities(filter?: {
        status?: CurationStatus;
        launchReadiness?: LaunchReadinessStatus;
        activeNow?: boolean;
        city?: string;
    }): FeaturedCityEntry[];
    upsertFeaturedCity(input: Omit<FeaturedCityEntry, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & {
        id?: string;
        actorUserId: string;
    }): FeaturedCityEntry;
    removeFeaturedCity(input: {
        id: string;
        actorUserId: string;
        reason: string;
        note?: string;
    }): FeaturedCityEntry | undefined;
    listManualBoostRules(filter?: {
        status?: CurationStatus;
        targetType?: ManualBoostRule["targetType"];
        activeNow?: boolean;
    }): ManualBoostRule[];
    upsertManualBoostRule(input: Omit<ManualBoostRule, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & {
        id?: string;
        actorUserId: string;
    }): ManualBoostRule;
    listLaunchCollections(filter?: {
        status?: CurationStatus;
        city?: string;
        visibility?: LaunchCollection["visibility"];
    }): LaunchCollection[];
    upsertLaunchCollection(input: Omit<LaunchCollection, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & {
        id?: string;
        actorUserId: string;
        items?: LaunchCollectionItem[];
    }): LaunchCollection;
    addLaunchCollectionItem(input: {
        actorUserId: string;
        collectionId: string;
        itemType: LaunchCollectionItem["itemType"];
        itemId: string;
        order: number;
        note?: string;
    }): LaunchCollection | undefined;
    listSourceHealthReviewItems(filter?: {
        status?: SourceHealthReviewItem["status"];
        severity?: SourceHealthReviewItem["severity"];
        city?: string;
        provider?: string;
    }): SourceHealthReviewItem[];
    upsertSourceHealthReviewItem(input: Omit<SourceHealthReviewItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & {
        id?: string;
        actorUserId: string;
    }): SourceHealthReviewItem;
    getLaunchReadiness(city?: string): {
        city: string;
        launchReadiness: LaunchReadinessStatus;
        status: CurationStatus;
        readinessMetadata: Record<string, unknown>;
        activeFeaturedCreators: number;
        activeFeaturedPlaces: number;
        sourceHealthOpenIssues: number;
    }[];
    getCurationPreview(input: {
        city?: string;
        categoryId?: string;
    }): {
        featuredCreators: FeaturedCreatorEntry[];
        featuredPlaces: FeaturedPlaceEntry[];
        activeBoosts: ManualBoostRule[];
        launchCollections: LaunchCollection[];
        why: string;
    };
    getCurationInsights(): {
        activeFeaturedCreators: number;
        activeFeaturedPlaces: number;
        activeFeaturedCities: number;
        activeBoosts: number;
        launchMarketsByStatus: Record<string, number>;
        sourceHealthIssuesByType: Record<string, number>;
        moderationBlockedFeatureAttempts: number;
    };
    listAuditLogs(limit?: number): AdminActionAudit[];
    private recordAudit;
}

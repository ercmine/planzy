import type { CanonicalPlace, DuplicateCandidate, DuplicateCandidateStatus, PlaceAttachmentLink, PlaceStore } from "./types.js";
export declare class PlaceMaintenanceService {
    private readonly store;
    private readonly hooks?;
    constructor(store: PlaceStore, hooks?: {
        onRecompute?: (placeIds: string[], reason: string) => void;
    } | undefined);
    detectDuplicateCandidates(): DuplicateCandidate[];
    reviewDuplicateCandidate(input: {
        candidateId: string;
        actorUserId: string;
        status: Exclude<DuplicateCandidateStatus, "merged">;
        note?: string;
    }): DuplicateCandidate | undefined;
    mergePlaces(input: {
        targetPlaceId: string;
        sourcePlaceIds: string[];
        actorUserId: string;
        reason?: string;
        allowFarDistance?: boolean;
        fieldOverrides?: Partial<CanonicalPlace>;
    }): CanonicalPlace;
    correctPlace(input: {
        placeId: string;
        actorUserId: string;
        reason: string;
        note?: string;
        updates: Partial<Pick<CanonicalPlace, "primaryDisplayName" | "canonicalCategory" | "canonicalSubcategory" | "locality" | "region" | "formattedAddress" | "latitude" | "longitude" | "status">>;
        lockFields?: Array<keyof CanonicalPlace["manualOverrides"]>;
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
        status: import("./types.js").PlaceStatus;
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
        descriptionStatus: import("./types.js").DescriptionStatus;
        descriptionSourceType?: import("./types.js").PlaceDescriptionCandidate["sourceType"];
        descriptionSourceProvider?: string;
        descriptionSourceAttribution?: string;
        descriptionConfidence: number;
        descriptionGeneratedAt?: string;
        descriptionVersion: number;
        descriptionLanguage?: string;
        descriptionGenerationMethod?: import("./types.js").PlaceDescriptionCandidate["generationMethod"];
        alternateDescriptions: import("./types.js").PlaceDescriptionCandidate[];
        descriptionProvenance: Array<{
            candidateId: string;
            provider?: string;
            sourceRecordId?: string;
            sourceType: import("./types.js").DescriptionSourceType;
        }>;
        aiGeneratedDescription: boolean;
        editorialDescription: boolean;
        descriptionCandidates: import("./types.js").PlaceDescriptionCandidate[];
        primaryPhoto?: import("./types.js").CanonicalPhoto;
        photoGallery: import("./types.js").CanonicalPhoto[];
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
        sourceLinks: import("./types.js").CanonicalPlaceSourceLink[];
        sourceRecordIds: string[];
        fieldAttribution: import("./types.js").PlaceFieldAttribution[];
        firstSeenAt: string;
        lastSeenAt: string;
        lastMergedAt: string;
    } | undefined;
    reassignAttachment(input: {
        actorUserId: string;
        linkId: string;
        toPlaceId: string;
        reason: string;
    }): PlaceAttachmentLink;
    private audit;
}

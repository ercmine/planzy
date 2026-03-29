import type { CampaignBudget, EligibilityDecision, FraudFlag, LedgerEntry, PlaceOwnerAccess, QualifyingAction, RewardClaim, SponsoredCampaign, SponsoredLocationStore, SponsoredRewardRule, VisitSession } from "./types.js";
export declare class SponsoredLocationsService {
    private readonly store;
    private readonly options;
    constructor(store: SponsoredLocationStore, options?: {
        platformFeeBps?: number;
        placeCoordinates?: (placeId: string) => {
            lat: number;
            lng: number;
        } | null;
        onUserRewardPaid?: (input: {
            userId: string;
            amountAtomic: bigint;
            campaignId: string;
            claimId: string;
        }) => Promise<void>;
    });
    requestPlaceAccess(input: {
        placeId: string;
        businessId: string;
        userId: string;
        role?: "owner" | "manager";
    }): PlaceOwnerAccess;
    approvePlaceAccess(input: {
        accessId: string;
        adminUserId: string;
    }): PlaceOwnerAccess;
    createCampaign(input: {
        businessId: string;
        createdBy: string;
        placeId: string;
        title: string;
        callToAction?: string;
        categoryTags?: string[];
        placements: SponsoredCampaign["placements"];
        targetRadiusMeters?: number;
        startsAt: string;
        endsAt: string;
        dailyBudgetDryad: number;
        totalBudgetDryad: number;
        rewardRule: {
            type?: SponsoredRewardRule["type"];
            payoutPerVisitDryad: number;
            decayBps?: number;
            firstXDaily?: number;
            splitWindowDays?: number;
            cooldownHours?: number;
            dwellSeconds?: number;
            requiredActions?: QualifyingAction[];
            oneRewardPerDay?: boolean;
        };
    }): {
        campaign: SponsoredCampaign;
        rewardRule: SponsoredRewardRule;
        budget: CampaignBudget;
    };
    fundCampaign(input: {
        campaignId: string;
        businessId: string;
        amountDryad: number;
    }): CampaignBudget;
    getSponsoredPlacements(input: {
        lat: number;
        lng: number;
        surface: SponsoredCampaign["placements"][number];
    }): {
        campaign: SponsoredCampaign;
        badge: string;
        rewardEnabled: boolean;
        estimatedRewardDryad: number;
        poolRemainingAtomic: bigint;
    }[];
    startVisitSession(input: {
        userId: string;
        campaignId: string;
        lat: number;
        lng: number;
    }): VisitSession;
    heartbeatVisit(input: {
        visitSessionId: string;
        lat: number;
        lng: number;
        elapsedSeconds: number;
    }): VisitSession;
    verifyVisit(input: {
        visitSessionId: string;
        actions: QualifyingAction[];
        deviceId?: string;
        ipHash?: string;
    }): EligibilityDecision;
    claimReward(input: {
        visitSessionId: string;
        userId: string;
    }): Promise<RewardClaim>;
    adminModerateClaim(input: {
        claimId: string;
        action: "approve" | "reject";
        adminUserId: string;
        reason?: string;
    }): RewardClaim;
    setCampaignStatus(input: {
        campaignId: string;
        businessId?: string;
        status: SponsoredCampaign["status"];
        adminOverride?: boolean;
    }): SponsoredCampaign;
    issueRefund(input: {
        campaignId: string;
        adminUserId: string;
        reason?: string;
    }): {
        campaign: SponsoredCampaign;
        budget: CampaignBudget;
        refundedAtomic: bigint;
    };
    listBusinessCampaigns(businessId: string): {
        campaign: SponsoredCampaign;
        budget: CampaignBudget;
        rule: SponsoredRewardRule;
        claims: RewardClaim[];
    }[];
    listUserRewardHistory(userId: string): RewardClaim[];
    listFraudFlags(): FraudFlag[];
    listCampaignLedger(campaignId: string): LedgerEntry[];
    private requireCampaign;
    private requireBudget;
    private requireRule;
    private requireVisit;
    private calculatePayout;
    private flagFraud;
    private addLedger;
}

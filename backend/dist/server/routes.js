import { matchPath } from "./httpServer.js";
import { applyCors, handleCorsPreflight } from "./cors.js";
import { createAccountsHttpHandlers } from "../accounts/http.js";
import { createDiscoveryHttpHandlers } from "../discovery/http.js";
import { createGeoHttpHandlers } from "../geo/http.js";
import { createRankingTuningHandlers } from "../discovery/tuningHttp.js";
import { createCreatorHttpHandlers } from "../creator/http.js";
import { createCreatorVerificationHttpHandlers } from "../creatorVerification/http.js";
import { createCreatorMonetizationHttpHandlers } from "../creatorMonetization/http.js";
import { createCreatorPremiumHttpHandlers } from "../creatorPremium/http.js";
import { createBusinessAnalyticsHttpHandlers } from "../businessAnalytics/http.js";
import { createCollaborationHttpHandlers } from "../collaboration/http.js";
import { createBusinessPremiumHttpHandlers } from "../businessPremium/http.js";
import { PermissionAction, ProfileType } from "../accounts/types.js";
import { handleMerchantHttpError, createMerchantHttpHandlers } from "../merchant/http.js";
import { ValidationError } from "../plans/errors.js";
import { sanitizeText } from "../sanitize/text.js";
import { createSubscriptionHttpHandlers } from "../subscriptions/http.js";
import { getPlan } from "../subscriptions/catalog.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import { FEATURE_KEYS, QUOTA_KEYS } from "../subscriptions/accessEngine.js";
import { buildCategorySearchPlan, getCategoryDefinition, rankAndFilterCategoryResults } from "../services/categoryIntelligence.js";
import { categoryToIncludedTypes, fetchPlaceDetail, GooglePlacesError, searchNearby } from "../services/googlePlaces.js";
import { createTelemetryHttpHandlers } from "../telemetry/http.js";
import { createVenueClaimsHttpHandlers, parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import { getPlaceReviewVideoSection } from "../reviews/placeVideoSection.js";
import { ReviewEligibilityService } from "../reviews/reviewEligibility.js";
import { createOutingPlannerHandlers } from "../outingPlanner/http.js";
import { createNotificationHttpHandlers } from "../notifications/http.js";
import { createAnalyticsHttpHandlers } from "../analytics/http.js";
import { createAdminHttpHandlers } from "../admin/http.js";
import { AdminService } from "../admin/service.js";
import { autocompleteCanonicalPlaces } from "../places/autocomplete.js";
import { searchCanonicalPlacesInBounds } from "../places/mapDiscovery.js";
import { matchVisitToCanonicalPlace } from "../places/visitMatcher.js";
import { createRolloutHttpHandlers } from "../rollouts/http.js";
import { createVideoPlatformHttpHandlers } from "../videoPlatform/http.js";
import { createAccomplishmentsHttpHandlers } from "../accomplishments/http.js";
import { createChallengesHttpHandlers } from "../challenges/http.js";
import { createLeaderboardHttpHandlers } from "../leaderboards/http.js";
import { createCollectionsHttpHandlers } from "../collections/http.js";
import { createSocialGamificationHttpHandlers } from "../socialGamification/http.js";
import { createGamificationControlHttpHandlers } from "../gamificationControl/http.js";
import { rolloutErrorPayload, RolloutAccessError } from "../rollouts/service.js";
import { createPerbugRewardsHttpHandlers } from "../perbugRewards/http.js";
import { createPerbugTipsHttpHandlers } from "../perbugTips/http.js";
import { createCompetitionHttpHandlers } from "../competition/http.js";
import { createSponsoredLocationsHttpHandlers } from "../sponsoredLocations/http.js";
import { createPerbugEconomyHttpHandlers } from "../perbugEconomy/http.js";
import { createViewerEngagementRewardsHttpHandlers } from "../viewerEngagementRewards/http.js";
import { createPerbugMarketplaceHttpHandlers as createPerbugLegacyHttpHandlers } from "../perbug/http.js";
import { createPerbugMarketplaceHttpHandlers } from "../perbugMarketplace/http.js";
import { createWalletAuthHttpHandlers } from "../walletAuth/http.js";
const DEFAULT_PUBLIC_API_BASE_URL = "https://api.perbug.com";
const DEFAULT_GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL = "https://places.googleapis.com/v1";
const PREMIUM_CONTENT = {
    "article-free-city-guide": { contentId: "article-free-city-guide", visibility: "free" },
    "article-premium-hidden-gems": { contentId: "article-premium-hidden-gems", visibility: "premium" },
    "creator-growth-playbook": { contentId: "creator-growth-playbook", visibility: "creator_only" },
    "business-ads-template-pack": { contentId: "business-ads-template-pack", visibility: "business_only" }
};
function normalizeReportReason(value) {
    const allowed = [
        "spam",
        "harassment_bullying",
        "hate_abusive_language",
        "sexual_explicit",
        "graphic_violent",
        "dangerous_illegal",
        "misleading_fake_review",
        "off_topic_irrelevant",
        "impersonation_stolen_content",
        "privacy_violation",
        "self_harm_concern",
        "scam_fraud",
        "other"
    ];
    const reason = String(value ?? "other").trim();
    return allowed.includes(reason) ? reason : "other";
}
function assertAdmin(req) {
    const expectedKey = process.env.ADMIN_API_KEY;
    if (!expectedKey)
        return false;
    return readHeader(req, "x-admin-key") === expectedKey;
}
function parseLocationProof(input) {
    const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const toNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    return {
        lat: toNumber(payload.lat),
        lng: toNumber(payload.lng),
        accuracyMeters: toNumber(payload.accuracyMeters ?? payload.accuracy),
        capturedAt: payload.capturedAt == null ? undefined : String(payload.capturedAt),
        isMocked: payload.isMocked === true,
        speedMps: toNumber(payload.speedMps)
    };
}
export function createRoutes(service, merchantService, deps) {
    const handlers = createVenueClaimsHttpHandlers(service);
    const merchantHandlers = createMerchantHttpHandlers(merchantService);
    const telemetryHandlers = deps?.telemetryService ? createTelemetryHttpHandlers(deps.telemetryService) : null;
    const subscriptionHandlers = deps?.subscriptionService && deps?.entitlementPolicy
        ? createSubscriptionHttpHandlers(deps.subscriptionService, deps.entitlementPolicy)
        : null;
    const accountHandlers = deps?.accountsService ? createAccountsHttpHandlers(deps.accountsService) : null;
    const discoveryHandlers = deps?.discovery ? createDiscoveryHttpHandlers(deps.discovery) : null;
    const geoHandlers = createGeoHttpHandlers(deps?.geoGateway ?? null, {
        authSecret: process.env.GEO_INTERNAL_AUTH_SECRET,
        rateLimitPerMinute: Number(process.env.GEO_PUBLIC_RATE_LIMIT_PER_MINUTE ?? 180),
        listCanonicalPlaces: () => deps?.placeService?.listCanonicalPlaces() ?? [],
        getStatus: () => ({
            mode: deps?.geoStatus?.mode ?? (deps?.geoGateway ? "custom" : "disabled"),
            routesMounted: true,
            upstreamBaseUrl: deps?.geoStatus?.upstreamBaseUrl,
            envValidationErrors: deps?.geoStatus?.validationErrors ?? [],
            envValidationWarnings: deps?.geoStatus?.validationWarnings ?? []
        })
    });
    const rankingTuningHandlers = deps?.rankingTuning ? createRankingTuningHandlers(deps.rankingTuning.service, deps.rankingTuning.resolver, deps.rankingTuning.repo) : null;
    const creatorHandlers = deps?.creatorService ? createCreatorHttpHandlers(deps.creatorService) : null;
    const creatorVerificationHandlers = deps?.creatorVerificationService ? createCreatorVerificationHttpHandlers(deps.creatorVerificationService) : null;
    const creatorMonetizationHandlers = deps?.creatorMonetizationService ? createCreatorMonetizationHttpHandlers(deps.creatorMonetizationService) : null;
    const creatorPremiumHandlers = deps?.creatorPremiumService ? createCreatorPremiumHttpHandlers(deps.creatorPremiumService) : null;
    const businessAnalyticsHandlers = deps?.businessAnalyticsService ? createBusinessAnalyticsHttpHandlers(deps.businessAnalyticsService) : null;
    const collaborationHandlers = deps?.collaborationService && deps?.accountsService ? createCollaborationHttpHandlers(deps.collaborationService, deps.accountsService) : null;
    const businessPremiumHandlers = deps?.businessPremiumService ? createBusinessPremiumHttpHandlers(deps.businessPremiumService) : null;
    const outingPlannerHandlers = deps?.outingPlannerService ? createOutingPlannerHandlers(deps.outingPlannerService, deps.rolloutService) : null;
    const rolloutHandlers = deps?.rolloutService ? createRolloutHttpHandlers(deps.rolloutService) : null;
    const notificationHandlers = deps?.notificationService ? createNotificationHttpHandlers(deps.notificationService) : null;
    const analyticsHandlers = deps?.analyticsService && deps?.analyticsQueryService ? createAnalyticsHttpHandlers(deps.analyticsService, deps.analyticsQueryService) : null;
    const videoPlatformHandlers = deps?.videoPlatformService ? createVideoPlatformHttpHandlers(deps.videoPlatformService) : null;
    const reviewEligibilityService = deps?.reviewEligibilityService ?? new ReviewEligibilityService();
    const onboardingHandlers = deps?.onboardingHandlers ?? null;
    const accomplishmentsHandlers = deps?.accomplishmentsService ? createAccomplishmentsHttpHandlers(deps.accomplishmentsService) : null;
    const challengesHandlers = deps?.challengesService ? createChallengesHttpHandlers(deps.challengesService) : null;
    const leaderboardHandlers = deps?.leaderboardsService ? createLeaderboardHttpHandlers(deps.leaderboardsService) : null;
    const collectionsHandlers = deps?.collectionsService ? createCollectionsHttpHandlers(deps.collectionsService) : null;
    const socialGamificationHandlers = deps?.socialGamificationService ? createSocialGamificationHttpHandlers(deps.socialGamificationService) : null;
    const gamificationControlHandlers = deps?.gamificationControlService ? createGamificationControlHttpHandlers(deps.gamificationControlService) : null;
    const perbugRewardsHandlers = deps?.perbugRewardsService ? createPerbugRewardsHttpHandlers(deps.perbugRewardsService) : null;
    const walletAuthHandlers = deps?.walletAuthService ? createWalletAuthHttpHandlers(deps.walletAuthService) : null;
    const perbugTipsHandlers = deps?.perbugTipsService ? createPerbugTipsHttpHandlers(deps.perbugTipsService) : null;
    const competitionHandlers = deps?.competitionService ? createCompetitionHttpHandlers(deps.competitionService) : null;
    const sponsoredLocationHandlers = deps?.sponsoredLocationsService ? createSponsoredLocationsHttpHandlers(deps.sponsoredLocationsService) : null;
    const economyHandlers = deps?.perbugEconomyService ? createPerbugEconomyHttpHandlers(deps.perbugEconomyService) : null;
    const viewerRewardsHandlers = deps?.viewerEngagementRewardsService ? createViewerEngagementRewardsHttpHandlers(deps.viewerEngagementRewardsService) : null;
    const perbugHandlers = deps?.perbugService ? createPerbugLegacyHttpHandlers(deps.perbugService) : null;
    const perbugWorldHandlers = deps?.perbugWorldHandlers ?? null;
    const perbugMarketplaceHandlers = deps?.perbugMarketplaceService ? createPerbugMarketplaceHttpHandlers(deps.perbugMarketplaceService) : null;
    const placeAutocompleteCache = new Map();
    const adminHandlers = deps?.accountsService && deps?.moderationService
        ? createAdminHttpHandlers(new AdminService({
            accountsService: deps.accountsService,
            moderationService: deps.moderationService,
            creatorVerificationService: deps.creatorVerificationService,
            venueClaimsService: service,
            placeService: deps.placeService,
            subscriptionService: deps.subscriptionService,
            reviewsStore: deps.reviewsStore
        }))
        : null;
    const track = async (event, context = {}) => {
        if (!deps?.analyticsService)
            return;
        await deps.analyticsService.track(event, { platform: "backend", environment: process.env.NODE_ENV ?? "dev", ...context });
    };
    return async function route(req, res) {
        const corsResult = applyCors(req, res);
        if (handleCorsPreflight(req, res, corsResult)) {
            return;
        }
        const base = `http://${req.headers.host ?? "localhost"}`;
        const url = new URL(req.url ?? "/", base);
        const normalizedPath = normalizeAliasPath(url.pathname);
        try {
            if (req.method === "GET" && normalizedPath === "/v1/perbug/marketplace/listings" && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.listListings(req, res);
                return;
            }
            const perbugListingDetailMatch = matchPath("/v1/perbug/marketplace/listings/:listingId", normalizedPath);
            if (req.method === "GET" && perbugListingDetailMatch && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.getListingDetail(req, res, perbugListingDetailMatch.listingId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/marketplace/featured" && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.featuredListings(req, res);
                return;
            }
            const perbugCategoryMatch = matchPath("/v1/perbug/marketplace/categories/:category", normalizedPath);
            if (req.method === "GET" && perbugCategoryMatch && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.listByCategory(req, res, perbugCategoryMatch.category);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/marketplace/search" && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.search(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/marketplace/categories" && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.categories(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/marketplace/analytics" && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.analytics(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/marketplace/capabilities" && perbugMarketplaceHandlers) {
                await perbugMarketplaceHandlers.capabilities(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/world/bootstrap" && perbugWorldHandlers) {
                await perbugWorldHandlers.bootstrap(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/world/move" && perbugWorldHandlers) {
                await perbugWorldHandlers.move(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/world/encounter/preview" && perbugWorldHandlers) {
                await perbugWorldHandlers.previewEncounter(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/world/encounter/launch" && perbugWorldHandlers) {
                await perbugWorldHandlers.launchEncounter(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/world/encounter/action" && perbugWorldHandlers) {
                await perbugWorldHandlers.submitEncounterAction(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/world/encounter/finalize" && perbugWorldHandlers) {
                await perbugWorldHandlers.finalizeEncounter(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/world/encounter/abandon" && perbugWorldHandlers) {
                await perbugWorldHandlers.abandonEncounter(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/world/encounter/retry" && perbugWorldHandlers) {
                await perbugWorldHandlers.retryEncounter(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/world/encounter/resolve" && perbugWorldHandlers) {
                await perbugWorldHandlers.resolveEncounter(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/competition/home" && competitionHandlers) {
                await competitionHandlers.home(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/trees" && perbugHandlers) {
                await perbugHandlers.listTrees(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/trees/owned" && perbugHandlers) {
                const wallet = String(url.searchParams.get("wallet") ?? "");
                await perbugHandlers.listOwnedTrees(req, res, wallet);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/market/listings" && perbugHandlers) {
                await perbugHandlers.listListings(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/spots/unclaimed" && perbugHandlers) {
                await perbugHandlers.listUnclaimedSpots(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/world" && perbugHandlers) {
                await perbugHandlers.worldSnapshot(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/map/pulse" && perbugHandlers) {
                await perbugHandlers.mapPulse(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/market/pulse" && perbugHandlers) {
                await perbugHandlers.marketPulse(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/creators/trees" && perbugHandlers) {
                await perbugHandlers.creatorTreeProfiles(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/trees/replantable" && perbugHandlers) {
                const wallet = String(url.searchParams.get("wallet") ?? "");
                await perbugHandlers.listReplantableTrees(req, res, wallet);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/tend" && perbugHandlers) {
                const wallet = String(url.searchParams.get("wallet") ?? "");
                await perbugHandlers.tendQueue(req, res, wallet);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/progression" && perbugHandlers) {
                const wallet = String(url.searchParams.get("wallet") ?? "");
                await perbugHandlers.progression(req, res, wallet);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/return-triggers" && perbugHandlers) {
                const wallet = String(url.searchParams.get("wallet") ?? "");
                await perbugHandlers.returnTriggers(req, res, wallet);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/watch" && perbugHandlers) {
                await perbugHandlers.watchTree(req, res);
                return;
            }
            if (req.method === "DELETE" && normalizedPath === "/v1/perbug/watch" && perbugHandlers) {
                await perbugHandlers.unwatchTree(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/metrics/loops" && perbugHandlers) {
                await perbugHandlers.loopMetrics(req, res);
                return;
            }
            const perbugTreeMatch = matchPath("/v1/perbug/trees/:treeId", normalizedPath);
            if (req.method === "GET" && perbugTreeMatch && perbugHandlers) {
                await perbugHandlers.getTree(req, res, perbugTreeMatch.treeId);
                return;
            }
            const perbugTreeEligibilityMatch = matchPath("/v1/perbug/trees/:treeId/dig-up-eligibility", normalizedPath);
            if (req.method === "GET" && perbugTreeEligibilityMatch && perbugHandlers) {
                const wallet = String(url.searchParams.get("wallet") ?? "");
                await perbugHandlers.getDigUpEligibility(req, res, perbugTreeEligibilityMatch.treeId, wallet);
                return;
            }
            const perbugTreeWaterEligibilityMatch = matchPath("/v1/perbug/trees/:treeId/water-eligibility", normalizedPath);
            if (req.method === "GET" && perbugTreeWaterEligibilityMatch && perbugHandlers) {
                const wallet = String(url.searchParams.get("wallet") ?? "");
                await perbugHandlers.getWaterEligibility(req, res, perbugTreeWaterEligibilityMatch.treeId, wallet);
                return;
            }
            const perbugLifecycleMatch = matchPath("/v1/perbug/trees/:treeId/lifecycle", normalizedPath);
            if (req.method === "GET" && perbugLifecycleMatch && perbugHandlers) {
                await perbugHandlers.getTreeLifecycle(req, res, perbugLifecycleMatch.treeId);
                return;
            }
            const digUpIntentCreationMatch = matchPath("/v1/perbug/trees/:treeId/dig-up-intents", normalizedPath);
            if (req.method === "POST" && digUpIntentCreationMatch && perbugHandlers) {
                await perbugHandlers.createDigUpIntent(req, res, digUpIntentCreationMatch.treeId);
                return;
            }
            const digUpConfirmMatch = matchPath("/v1/perbug/dig-up-intents/:intentId/confirm", normalizedPath);
            if (req.method === "POST" && digUpConfirmMatch && perbugHandlers) {
                await perbugHandlers.confirmDigUpIntent(req, res, digUpConfirmMatch.intentId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/replant-intents" && perbugHandlers) {
                await perbugHandlers.createReplantIntent(req, res);
                return;
            }
            const replantConfirmMatch = matchPath("/v1/perbug/replant-intents/:intentId/confirm", normalizedPath);
            if (req.method === "POST" && replantConfirmMatch && perbugHandlers) {
                await perbugHandlers.confirmReplantIntent(req, res, replantConfirmMatch.intentId);
                return;
            }
            const claimPlantMatch = matchPath("/v1/perbug/trees/:treeId/claim-plant", normalizedPath);
            if (req.method === "POST" && claimPlantMatch && perbugHandlers) {
                await perbugHandlers.claimAndPlant(req, res, claimPlantMatch.treeId);
                return;
            }
            const waterTreeMatch = matchPath("/v1/perbug/trees/:treeId/water", normalizedPath);
            if (req.method === "POST" && waterTreeMatch && perbugHandlers) {
                await perbugHandlers.waterTree(req, res, waterTreeMatch.treeId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/market/listings" && perbugHandlers) {
                await perbugHandlers.listTree(req, res);
                return;
            }
            const unlistMatch = matchPath("/v1/perbug/market/listings/:treeId", normalizedPath);
            if (req.method === "DELETE" && unlistMatch && perbugHandlers) {
                await perbugHandlers.unlistTree(req, res, unlistMatch.treeId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug/market/buy" && perbugHandlers) {
                await perbugHandlers.buyTree(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/competition/missions" && competitionHandlers) {
                await competitionHandlers.missions(req, res);
                return;
            }
            const missionProgressMatch = matchPath("/v1/competition/missions/:missionId/progress", normalizedPath);
            if (req.method === "GET" && missionProgressMatch && competitionHandlers) {
                await competitionHandlers.missionProgress(req, res, missionProgressMatch.missionId);
                return;
            }
            const missionClaimMatch = matchPath("/v1/competition/missions/:missionId/claim", normalizedPath);
            if (req.method === "POST" && missionClaimMatch && competitionHandlers) {
                await competitionHandlers.claimMission(req, res, missionClaimMatch.missionId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/competition/leaderboards" && competitionHandlers) {
                await competitionHandlers.leaderboards(req, res);
                return;
            }
            const leaderboardMatch = matchPath("/v1/competition/leaderboards/:leaderboardId", normalizedPath);
            if (req.method === "GET" && leaderboardMatch && competitionHandlers) {
                await competitionHandlers.leaderboard(req, res, leaderboardMatch.leaderboardId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/competition/rewards/me" && competitionHandlers) {
                await competitionHandlers.myRewards(req, res);
                return;
            }
            const rewardClaimMatch = matchPath("/v1/competition/rewards/:rewardId/claim", normalizedPath);
            if (req.method === "POST" && rewardClaimMatch && competitionHandlers) {
                await competitionHandlers.claimReward(req, res, rewardClaimMatch.rewardId);
                return;
            }
            const qualityMatch = matchPath("/v1/competition/videos/:videoId/quality", normalizedPath);
            if (req.method === "GET" && qualityMatch && competitionHandlers) {
                await competitionHandlers.videoQuality(req, res, qualityMatch.videoId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/competition/seasons/current" && competitionHandlers) {
                await competitionHandlers.season(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/competition/missions" && competitionHandlers) {
                await competitionHandlers.adminCreateMission(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/competition/leaderboards" && competitionHandlers) {
                await competitionHandlers.adminCreateLeaderboard(req, res);
                return;
            }
            const adminBlockRewardMatch = matchPath("/v1/admin/competition/rewards/:rewardId/block", normalizedPath);
            if (req.method === "POST" && adminBlockRewardMatch && competitionHandlers) {
                await competitionHandlers.adminBlockReward(req, res, adminBlockRewardMatch.rewardId);
                return;
            }
            const adminRecomputeMatch = matchPath("/v1/admin/competition/videos/:videoId/quality-recompute", normalizedPath);
            if (req.method === "POST" && adminRecomputeMatch && competitionHandlers) {
                await competitionHandlers.adminRecomputeQuality(req, res, adminRecomputeMatch.videoId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/competition/audit" && competitionHandlers) {
                await competitionHandlers.adminAudit(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/business/places/access-requests" && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.requestPlaceAccess(req, res);
                return;
            }
            const accessApproveMatch = matchPath("/v1/admin/business/places/access-requests/:accessId/approve", normalizedPath);
            if (req.method === "POST" && accessApproveMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.approvePlaceAccess(req, res, accessApproveMatch.accessId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/business/sponsored-campaigns" && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.createCampaign(req, res);
                return;
            }
            const campaignFundingMatch = matchPath("/v1/business/sponsored-campaigns/:campaignId/fund", normalizedPath);
            if (req.method === "POST" && campaignFundingMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.fundCampaign(req, res, campaignFundingMatch.campaignId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/business/sponsored-campaigns" && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.listBusinessCampaigns(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/discovery/sponsored-placements" && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.placements(req, res, url);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/visits/start" && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.startVisit(req, res);
                return;
            }
            const visitHeartbeatMatch = matchPath("/v1/visits/:visitSessionId/heartbeat", normalizedPath);
            if (req.method === "POST" && visitHeartbeatMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.heartbeatVisit(req, res, visitHeartbeatMatch.visitSessionId);
                return;
            }
            const verifyVisitMatch = matchPath("/v1/visits/:visitSessionId/verify", normalizedPath);
            if (req.method === "POST" && verifyVisitMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.verifyVisit(req, res, verifyVisitMatch.visitSessionId);
                return;
            }
            const claimVisitMatch = matchPath("/v1/visits/:visitSessionId/claim", normalizedPath);
            if (req.method === "POST" && claimVisitMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.claimReward(req, res, claimVisitMatch.visitSessionId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/rewards/claims/me" && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.userRewards(req, res);
                return;
            }
            const pauseCampaignMatch = matchPath("/v1/business/sponsored-campaigns/:campaignId/pause", normalizedPath);
            if (req.method === "POST" && pauseCampaignMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.pauseCampaign(req, res, pauseCampaignMatch.campaignId);
                return;
            }
            const resumeCampaignMatch = matchPath("/v1/business/sponsored-campaigns/:campaignId/resume", normalizedPath);
            if (req.method === "POST" && resumeCampaignMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.resumeCampaign(req, res, resumeCampaignMatch.campaignId);
                return;
            }
            const endCampaignMatch = matchPath("/v1/business/sponsored-campaigns/:campaignId/end", normalizedPath);
            if (req.method === "POST" && endCampaignMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.endCampaign(req, res, endCampaignMatch.campaignId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/sponsored/fraud-flags" && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.adminFraudFlags(req, res);
                return;
            }
            const adminReviewClaimMatch = matchPath("/v1/admin/sponsored/claims/:claimId/review", normalizedPath);
            if (req.method === "POST" && adminReviewClaimMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.adminReviewClaim(req, res, adminReviewClaimMatch.claimId);
                return;
            }
            const adminRefundMatch = matchPath("/v1/admin/sponsored/campaigns/:campaignId/refund", normalizedPath);
            if (req.method === "POST" && adminRefundMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.adminRefundCampaign(req, res, adminRefundMatch.campaignId);
                return;
            }
            const adminStatusMatch = matchPath("/v1/admin/sponsored/campaigns/:campaignId/status", normalizedPath);
            if (req.method === "POST" && adminStatusMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.adminSetCampaignStatus(req, res, adminStatusMatch.campaignId);
                return;
            }
            const campaignLedgerMatch = matchPath("/v1/admin/sponsored/campaigns/:campaignId/ledger", normalizedPath);
            if (req.method === "GET" && campaignLedgerMatch && sponsoredLocationHandlers) {
                await sponsoredLocationHandlers.campaignLedger(req, res, campaignLedgerMatch.campaignId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/perbug-economy/credit" && economyHandlers) {
                await economyHandlers.creditUser(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/perbug-economy/withdraw" && economyHandlers) {
                await economyHandlers.withdraw(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/business/quests" && economyHandlers) {
                await economyHandlers.createQuest(req, res);
                return;
            }
            const completeQuestMatch = matchPath("/v1/quests/:questId/complete", normalizedPath);
            if (req.method === "POST" && completeQuestMatch && economyHandlers) {
                await economyHandlers.completeQuest(req, res, completeQuestMatch.questId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/exploration/check-in" && economyHandlers) {
                await economyHandlers.checkIn(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/perbug-economy/collections" && economyHandlers) {
                await economyHandlers.upsertCollection(req, res);
                return;
            }
            const progressCollectionMatch = matchPath("/v1/collections/:collectionId/progress", normalizedPath);
            if (req.method === "POST" && progressCollectionMatch && economyHandlers) {
                await economyHandlers.progressCollection(req, res, progressCollectionMatch.collectionId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/creator/economy/rewards" && economyHandlers) {
                await economyHandlers.recordCreatorReward(req, res);
                return;
            }
            const claimCreatorRewardMatch = matchPath("/v1/creator/economy/rewards/:rewardId/claim", normalizedPath);
            if (req.method === "POST" && claimCreatorRewardMatch && economyHandlers) {
                await economyHandlers.claimCreatorReward(req, res, claimCreatorRewardMatch.rewardId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/curator/guides" && economyHandlers) {
                await economyHandlers.createGuide(req, res);
                return;
            }
            const guideAnalyticsMatch = matchPath("/v1/curator/guides/:guideId/analytics", normalizedPath);
            if (req.method === "POST" && guideAnalyticsMatch && economyHandlers) {
                await economyHandlers.guideAnalytics(req, res, guideAnalyticsMatch.guideId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/premium/membership/purchase" && economyHandlers) {
                await economyHandlers.purchaseMembership(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/business/offers" && economyHandlers) {
                await economyHandlers.createOffer(req, res);
                return;
            }
            const redeemOfferMatch = matchPath("/v1/offers/:offerId/redeem", normalizedPath);
            if (req.method === "POST" && redeemOfferMatch && economyHandlers) {
                await economyHandlers.redeemOffer(req, res, redeemOfferMatch.offerId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/perbug-economy/splits" && economyHandlers) {
                await economyHandlers.updateSplit(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/perbug-economy/dashboard" && economyHandlers) {
                await economyHandlers.adminDashboard(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug-economy/me" && economyHandlers) {
                await economyHandlers.consumerDashboard(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/creator/economy/dashboard" && economyHandlers) {
                await economyHandlers.creatorDashboard(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/business/economy/dashboard" && economyHandlers) {
                await economyHandlers.businessDashboard(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/video-engagement/watch-sessions" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.startSession(req, res);
                return;
            }
            const watchSessionHeartbeatMatch = matchPath("/v1/video-engagement/watch-sessions/:sessionId/heartbeat", normalizedPath);
            if (req.method === "POST" && watchSessionHeartbeatMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.heartbeat(req, res, watchSessionHeartbeatMatch.sessionId);
                return;
            }
            const watchSessionPauseMatch = matchPath("/v1/video-engagement/watch-sessions/:sessionId/pause", normalizedPath);
            if (req.method === "POST" && watchSessionPauseMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.pauseSession(req, res, watchSessionPauseMatch.sessionId);
                return;
            }
            const watchSessionCompleteMatch = matchPath("/v1/video-engagement/watch-sessions/:sessionId/complete", normalizedPath);
            if (req.method === "POST" && watchSessionCompleteMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.completeSession(req, res, watchSessionCompleteMatch.sessionId);
                return;
            }
            const ratingRewardMatch = matchPath("/v1/video-engagement/videos/:videoId/rating", normalizedPath);
            if (req.method === "POST" && ratingRewardMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.submitRating(req, res, ratingRewardMatch.videoId);
                return;
            }
            const commentRewardMatch = matchPath("/v1/video-engagement/videos/:videoId/comments", normalizedPath);
            if (req.method === "POST" && commentRewardMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.submitComment(req, res, commentRewardMatch.videoId);
                return;
            }
            const engagementRewardMatch = matchPath("/v1/video-engagement/videos/:videoId/interactions", normalizedPath);
            if (req.method === "POST" && engagementRewardMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.submitEngagement(req, res, engagementRewardMatch.videoId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/video-engagement/eligibility" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.getEligibility(req, res, url.searchParams);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/video-engagement/rewards/me" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.listRewards(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/video-engagement/rewards/me/summary" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.rewardSummary(req, res);
                return;
            }
            const campaignMetaMatch = matchPath("/v1/video-engagement/videos/:videoId/campaign", normalizedPath);
            if (req.method === "GET" && campaignMetaMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.campaignMetadata(req, res, campaignMetaMatch.videoId);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/video-engagement/sponsored-pools" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.createSponsoredPool(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/video-engagement/video-campaign-map" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.mapVideoCampaign(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/video-engagement/risk-flags" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.listRiskFlags(req, res, url.searchParams);
                return;
            }
            if (req.method === "PUT" && normalizedPath === "/v1/admin/video-engagement/rules" && viewerRewardsHandlers) {
                await viewerRewardsHandlers.updateRule(req, res);
                return;
            }
            const reverseRewardMatch = matchPath("/v1/admin/video-engagement/rewards/:ledgerEntryId/reverse", normalizedPath);
            if (req.method === "POST" && reverseRewardMatch && viewerRewardsHandlers) {
                await viewerRewardsHandlers.reverseReward(req, res, reverseRewardMatch.ledgerEntryId);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/social-gamification/feed" && socialGamificationHandlers) {
                await socialGamificationHandlers.feed(req, res, url);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/social-gamification/privacy" && socialGamificationHandlers) {
                await socialGamificationHandlers.privacy(req, res);
                return;
            }
            if (req.method === "PUT" && normalizedPath === "/v1/social-gamification/privacy" && socialGamificationHandlers) {
                await socialGamificationHandlers.updatePrivacy(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/social-gamification/actions" && socialGamificationHandlers) {
                await socialGamificationHandlers.recordAction(req, res);
                return;
            }
            if (req.method === "PUT" && normalizedPath === "/v1/admin/social-gamification/goals" && socialGamificationHandlers) {
                await socialGamificationHandlers.upsertGoal(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/collections" && collectionsHandlers) {
                await collectionsHandlers.list(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/auth/wallet/challenge" && walletAuthHandlers) {
                await walletAuthHandlers.createChallenge(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/auth/wallet/verify" && walletAuthHandlers) {
                await walletAuthHandlers.verifyChallenge(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/auth/session" && walletAuthHandlers) {
                await walletAuthHandlers.restoreSession(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/auth/logout" && walletAuthHandlers) {
                await walletAuthHandlers.logout(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/auth/wallets" && walletAuthHandlers) {
                await walletAuthHandlers.listWallets(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/auth/wallet-events" && walletAuthHandlers) {
                await walletAuthHandlers.verificationEvents(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/wallet-auth/nonce" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.createWalletNonce(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/wallet-auth/verify" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.verifyWalletLogin(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/creator/rewards/dashboard" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.dashboard(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/wallets/primary" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.setPrimaryWallet(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/wallets" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.listWallets(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/rewards/tiers" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.rewardTiers(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/rewards/me" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.dashboard(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/reward-tiers" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.rewardTiers(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/rewards/audit-logs" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.auditLogs(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/reviews" && perbugRewardsHandlers) {
                await perbugRewardsHandlers.submitReview(req, res);
                return;
            }
            const previewMatch = /^\/(?:v1\/)?places\/([^/]+)\/reward-preview$/.exec(normalizedPath);
            if (req.method === "GET" && previewMatch && perbugRewardsHandlers) {
                await perbugRewardsHandlers.preview(req, res, decodeURIComponent(previewMatch[1]));
                return;
            }
            const approveMatch = /^\/v1\/admin\/reviews\/([^/]+)\/approve$/.exec(normalizedPath);
            if (req.method === "POST" && approveMatch && perbugRewardsHandlers) {
                await perbugRewardsHandlers.approveReview(req, res, decodeURIComponent(approveMatch[1]));
                return;
            }
            const rejectMatch = /^\/v1\/admin\/reviews\/([^/]+)\/reject$/.exec(normalizedPath);
            if (req.method === "POST" && rejectMatch && perbugRewardsHandlers) {
                await perbugRewardsHandlers.rejectReview(req, res, decodeURIComponent(rejectMatch[1]));
                return;
            }
            const claimMatch = /^\/v1\/(?:rewards\/reviews|perbug\/rewards)\/([^/]+)\/claim$/.exec(normalizedPath);
            if (req.method === "POST" && claimMatch && perbugRewardsHandlers) {
                await perbugRewardsHandlers.claim(req, res, decodeURIComponent(claimMatch[1]));
                return;
            }
            const nextRewardMatch = /^\/v1\/perbug\/rewards\/places\/([^/]+)\/next$/.exec(normalizedPath);
            if (req.method === "GET" && nextRewardMatch && perbugRewardsHandlers) {
                await perbugRewardsHandlers.preview(req, res, decodeURIComponent(nextRewardMatch[1]));
                return;
            }
            const videoTipIntentMatch = /^\/v1\/perbug\/tips\/videos\/([^/]+)\/intents$/.exec(normalizedPath);
            if (req.method === "POST" && videoTipIntentMatch && perbugTipsHandlers) {
                await perbugTipsHandlers.createIntent(req, res, decodeURIComponent(videoTipIntentMatch[1]));
                return;
            }
            const videoTipSubmitMatch = /^\/v1\/perbug\/tips\/([^/]+)\/submit$/.exec(normalizedPath);
            if (req.method === "POST" && videoTipSubmitMatch && perbugTipsHandlers) {
                await perbugTipsHandlers.submit(req, res, decodeURIComponent(videoTipSubmitMatch[1]));
                return;
            }
            const videoTipsListMatch = /^\/v1\/perbug\/tips\/videos\/([^/]+)$/.exec(normalizedPath);
            if (req.method === "GET" && videoTipsListMatch && perbugTipsHandlers) {
                await perbugTipsHandlers.listVideo(req, res, decodeURIComponent(videoTipsListMatch[1]));
                return;
            }
            const creatorTipsSummaryMatch = /^\/v1\/perbug\/tips\/creator\/([^/]+)\/summary$/.exec(normalizedPath);
            if (req.method === "GET" && creatorTipsSummaryMatch && perbugTipsHandlers) {
                await perbugTipsHandlers.creatorSummary(req, res, decodeURIComponent(creatorTipsSummaryMatch[1]));
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/tips/me/sent" && perbugTipsHandlers) {
                await perbugTipsHandlers.sent(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/perbug/tips/me/received" && perbugTipsHandlers) {
                await perbugTipsHandlers.received(req, res);
                return;
            }
            const collectionDetailMatch = /^\/v1\/collections\/([^/]+)$/.exec(normalizedPath);
            if (req.method === "GET" && collectionDetailMatch && collectionsHandlers) {
                await collectionsHandlers.detail(req, res, decodeURIComponent(collectionDetailMatch[1]));
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/collections/events" && collectionsHandlers) {
                await collectionsHandlers.recordEvent(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/collections" && collectionsHandlers) {
                await collectionsHandlers.upsert(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/review-prompts/visit-match") {
                const payload = await parseJsonBody(req);
                const lat = Number(payload.lat);
                const lng = Number(payload.lng);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    throw new ValidationError(["lat and lng are required numbers"]);
                }
                const places = deps?.placeService?.listCanonicalPlaces() ?? [];
                const match = matchVisitToCanonicalPlace(places, {
                    lat,
                    lng,
                    reviewedPlaceIds: Array.isArray(payload.reviewedPlaceIds)
                        ? payload.reviewedPlaceIds.map((entry) => String(entry)).filter(Boolean)
                        : []
                });
                await track({
                    type: "review_prompt_visit_match_checked",
                    matched: match.matched,
                    canonicalPlaceId: match.canonicalPlaceId,
                    reason: match.reason,
                    confidence: match.confidence
                });
                sendJson(res, 200, match);
                return;
            }
            if (req.method === "GET" && (normalizedPath === "/v1/places/map-discovery" || normalizedPath === "/places/map-discovery")) {
                const north = Number(url.searchParams.get("north"));
                const south = Number(url.searchParams.get("south"));
                const east = Number(url.searchParams.get("east"));
                const west = Number(url.searchParams.get("west"));
                if (![north, south, east, west].every((value) => Number.isFinite(value))) {
                    throw new ValidationError(["north, south, east, and west are required numeric query parameters"]);
                }
                const categories = String(url.searchParams.get("categories") ?? "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                const zoom = Number(url.searchParams.get("zoom"));
                const limit = Number(url.searchParams.get("limit"));
                const centerLat = Number(url.searchParams.get("centerLat"));
                const centerLng = Number(url.searchParams.get("centerLng"));
                const mode = String(url.searchParams.get("mode") ?? "nearby").trim().toLowerCase();
                const places = deps?.placeService?.listCanonicalPlaces() ?? [];
                const items = searchCanonicalPlacesInBounds(places, {
                    bounds: { north, south, east, west },
                    categories,
                    zoom: Number.isFinite(zoom) ? zoom : undefined,
                    limit: Number.isFinite(limit) ? limit : undefined,
                    centerLat: Number.isFinite(centerLat) ? centerLat : undefined,
                    centerLng: Number.isFinite(centerLng) ? centerLng : undefined
                });
                await track({
                    type: "map_discovery_searched",
                    mode,
                    categories,
                    resultCount: items.length
                });
                sendJson(res, 200, {
                    bounds: { north, south, east, west },
                    categories,
                    mode,
                    places: items
                });
                return;
            }
            if (req.method === "GET" && (normalizedPath === "/v1/places/autocomplete" || normalizedPath === "/v1/places/search")) {
                const q = String(url.searchParams.get("q") ?? "").trim();
                if (!q) {
                    sendJson(res, 200, { query: "", suggestions: [], places: [] });
                    return;
                }
                const limit = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);
                const lat = url.searchParams.get("lat");
                const lng = url.searchParams.get("lng");
                const city = url.searchParams.get("city") ?? undefined;
                const region = url.searchParams.get("region") ?? undefined;
                const category = url.searchParams.get("category") ?? undefined;
                const rawScope = String(url.searchParams.get("scope") ?? "local").toLowerCase();
                const scope = rawScope === "regional" || rawScope === "global" ? rawScope : "local";
                const cacheKey = JSON.stringify({ q: q.toLowerCase(), limit, lat, lng, city, region, category, scope });
                const cacheHit = placeAutocompleteCache.get(cacheKey);
                if (cacheHit && cacheHit.expiresAt > Date.now()) {
                    sendJson(res, 200, cacheHit.payload);
                    return;
                }
                const places = deps?.placeService?.listCanonicalPlaces() ?? [];
                const suggestions = autocompleteCanonicalPlaces(places, {
                    q,
                    limit,
                    lat: lat ? Number(lat) : undefined,
                    lng: lng ? Number(lng) : undefined,
                    city,
                    region,
                    category,
                    scope
                });
                const payload = {
                    query: q,
                    suggestions,
                    places: suggestions.map((item) => ({
                        placeId: item.canonicalPlaceId,
                        canonicalPlaceId: item.canonicalPlaceId,
                        name: item.displayName,
                        category: item.category,
                        regionLabel: [item.city, item.region].filter(Boolean).join(", "),
                        distanceKm: typeof item.distanceMeters === "number" ? Number((item.distanceMeters / 1000).toFixed(2)) : undefined,
                        addressSnippet: item.addressSnippet,
                        thumbnailUrl: item.thumbnailUrl
                    }))
                };
                placeAutocompleteCache.set(cacheKey, { expiresAt: Date.now() + 20_000, payload });
                sendJson(res, 200, payload);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/") {
                sendJson(res, 200, {
                    service: "perbug-api",
                    version: "1.0.0"
                });
                return;
            }
            if (deps?.geoGateway && req.method === "GET" && normalizedPath === "/ready") {
                await geoHandlers.ready(req, res);
                return;
            }
            if (deps?.geoGateway && req.method === "GET" && normalizedPath === "/version") {
                await geoHandlers.version(req, res);
                return;
            }
            if (deps?.geoGateway && req.method === "GET" && normalizedPath === "/metrics") {
                await geoHandlers.metrics(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/overview" && adminHandlers) {
                await adminHandlers.overview(req, res);
                return;
            }
            if (rolloutHandlers && req.method === "GET" && normalizedPath === "/v1/rollouts/summary") {
                await rolloutHandlers.summary(req, res);
                return;
            }
            const rolloutEvalMatch = /^\/v1\/rollouts\/features\/([^/]+)$/.exec(normalizedPath);
            if (rolloutHandlers && req.method === "GET" && rolloutEvalMatch) {
                await rolloutHandlers.evaluate(req, res, decodeURIComponent(rolloutEvalMatch[1] ?? ""));
                return;
            }
            if (rolloutHandlers && req.method === "GET" && normalizedPath === "/v1/admin/rollouts") {
                await rolloutHandlers.adminList(req, res);
                return;
            }
            if (rolloutHandlers && req.method === "POST" && normalizedPath === "/v1/admin/rollouts") {
                await rolloutHandlers.adminUpsert(req, res);
                return;
            }
            if (rolloutHandlers && req.method === "GET" && normalizedPath === "/v1/admin/rollouts/audit") {
                await rolloutHandlers.adminAudit(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/users" && adminHandlers) {
                await adminHandlers.listUsers(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/moderation/queue" && adminHandlers) {
                await adminHandlers.listModerationQueue(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/moderation/actions" && adminHandlers) {
                await adminHandlers.moderationAction(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/curation/featured-creators" && adminHandlers) {
                await adminHandlers.listFeaturedCreators(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/curation/featured-creators" && adminHandlers) {
                await adminHandlers.upsertFeaturedCreator(req, res);
                return;
            }
            const featuredCreatorMatch = /^\/v1\/admin\/curation\/featured-creators\/([^/]+)$/.exec(normalizedPath);
            if (featuredCreatorMatch && req.method === "DELETE" && adminHandlers) {
                await adminHandlers.removeFeaturedCreator(req, res, featuredCreatorMatch[1] ?? "");
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/curation/featured-places" && adminHandlers) {
                await adminHandlers.listFeaturedPlaces(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/curation/featured-places" && adminHandlers) {
                await adminHandlers.upsertFeaturedPlace(req, res);
                return;
            }
            const featuredPlaceMatch = /^\/v1\/admin\/curation\/featured-places\/([^/]+)$/.exec(normalizedPath);
            if (featuredPlaceMatch && req.method === "DELETE" && adminHandlers) {
                await adminHandlers.removeFeaturedPlace(req, res, featuredPlaceMatch[1] ?? "");
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/curation/featured-cities" && adminHandlers) {
                await adminHandlers.listFeaturedCities(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/curation/featured-cities" && adminHandlers) {
                await adminHandlers.upsertFeaturedCity(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/curation/boosts" && adminHandlers) {
                await adminHandlers.listBoostRules(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/curation/boosts" && adminHandlers) {
                await adminHandlers.upsertBoostRule(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/curation/launch-collections" && adminHandlers) {
                await adminHandlers.listLaunchCollections(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/curation/launch-collections" && adminHandlers) {
                await adminHandlers.upsertLaunchCollection(req, res);
                return;
            }
            const launchCollectionItemsMatch = /^\/v1\/admin\/curation\/launch-collections\/([^/]+)\/items$/.exec(normalizedPath);
            if (launchCollectionItemsMatch && req.method === "POST" && adminHandlers) {
                await adminHandlers.addLaunchCollectionItem(req, res, launchCollectionItemsMatch[1] ?? "");
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/source-health/reviews" && adminHandlers) {
                await adminHandlers.listSourceHealthReviews(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/source-health/reviews" && adminHandlers) {
                await adminHandlers.upsertSourceHealthReview(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/launch-readiness" && adminHandlers) {
                await adminHandlers.launchReadiness(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/curation/preview" && adminHandlers) {
                await adminHandlers.curationPreview(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/curation/insights" && adminHandlers) {
                await adminHandlers.curationInsights(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/places" && adminHandlers) {
                await adminHandlers.listPlaces(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/places/duplicates:detect" && adminHandlers) {
                await adminHandlers.detectPlaceDuplicates(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/places/duplicates" && adminHandlers) {
                await adminHandlers.listPlaceDuplicateCandidates(req, res);
                return;
            }
            const duplicateCandidateMatch = /^\/v1\/admin\/places\/duplicates\/([^/]+)$/.exec(normalizedPath);
            if (duplicateCandidateMatch && req.method === "PATCH" && adminHandlers) {
                await adminHandlers.reviewPlaceDuplicateCandidate(req, res, duplicateCandidateMatch[1] ?? "");
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/places:merge" && adminHandlers) {
                await adminHandlers.mergeCanonicalPlaces(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/places/attachments:reassign" && adminHandlers) {
                await adminHandlers.reassignPlaceAttachment(req, res);
                return;
            }
            const placeCorrectionMatch = /^\/v1\/admin\/places\/([^/]+)\/corrections$/.exec(normalizedPath);
            if (placeCorrectionMatch && req.method === "PATCH" && adminHandlers) {
                await adminHandlers.correctCanonicalPlace(req, res, placeCorrectionMatch[1] ?? "");
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/places/maintenance/audit" && adminHandlers) {
                await adminHandlers.listPlaceMaintenanceAudits(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/places/import-source" && adminHandlers) {
                await adminHandlers.importPlaceSource(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/place-quality/overview" && adminHandlers) {
                await adminHandlers.placeQualityOverview(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/place-quality/issues" && adminHandlers) {
                await adminHandlers.listPlaceQualityIssues(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/place-quality/providers" && adminHandlers) {
                await adminHandlers.providerQualitySummary(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/ops/source-health" && adminHandlers) {
                await adminHandlers.sourceHealth(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/ops/subscriptions" && adminHandlers) {
                await adminHandlers.subscriptionsOps(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/ops/ads" && adminHandlers) {
                await adminHandlers.adsOps(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/business/claims" && adminHandlers) {
                await adminHandlers.businessClaims(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/audit" && adminHandlers) {
                await adminHandlers.audit(req, res);
                return;
            }
            const adminModerationTargetMatch = /^\/v1\/admin\/moderation\/targets\/([^/]+)\/([^/]+)$/.exec(normalizedPath);
            if (adminModerationTargetMatch && req.method === "GET" && adminHandlers) {
                await adminHandlers.moderationTarget(req, res, adminModerationTargetMatch[1] ?? "", adminModerationTargetMatch[2] ?? "");
                return;
            }
            const placeQualityIssueMatch = /^\/v1\/admin\/place-quality\/issues\/([^/]+)$/.exec(normalizedPath);
            if (placeQualityIssueMatch && req.method === "GET" && adminHandlers) {
                await adminHandlers.placeQualityIssueDetail(req, res, placeQualityIssueMatch[1] ?? "");
                return;
            }
            if (placeQualityIssueMatch && req.method === "PATCH" && adminHandlers) {
                await adminHandlers.updatePlaceQualityIssueStatus(req, res, placeQualityIssueMatch[1] ?? "");
                return;
            }
            const placeQualitySummaryMatch = /^\/v1\/admin\/places\/([^/]+)\/quality$/.exec(normalizedPath);
            if (placeQualitySummaryMatch && req.method === "GET" && adminHandlers) {
                await adminHandlers.placeQualitySummary(req, res, placeQualitySummaryMatch[1] ?? "");
                return;
            }
            const suspendUserMatch = /^\/v1\/admin\/users\/([^/]+)\/suspend$/.exec(normalizedPath);
            if (suspendUserMatch && req.method === "POST" && adminHandlers) {
                await adminHandlers.suspendUser(req, res, suspendUserMatch[1] ?? "");
                return;
            }
            const reinstateUserMatch = /^\/v1\/admin\/users\/([^/]+)\/reinstate$/.exec(normalizedPath);
            if (reinstateUserMatch && req.method === "POST" && adminHandlers) {
                await adminHandlers.reinstateUser(req, res, reinstateUserMatch[1] ?? "");
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/leaderboards/families" && leaderboardHandlers) {
                await leaderboardHandlers.families(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/leaderboards" && leaderboardHandlers) {
                await leaderboardHandlers.list(req, res, url);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/leaderboards/me" && leaderboardHandlers) {
                await leaderboardHandlers.me(req, res, url);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/leaderboards/events" && leaderboardHandlers) {
                await leaderboardHandlers.record(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/leaderboards/formulas" && leaderboardHandlers) {
                await leaderboardHandlers.formulas(req, res);
                return;
            }
            const leaderboardInspectMatch = /^\/v1\/admin\/leaderboards\/([^/]+)\/entities\/([^/]+)$/.exec(normalizedPath);
            if (leaderboardInspectMatch && req.method === "GET" && leaderboardHandlers) {
                await leaderboardHandlers.inspect(req, res, leaderboardInspectMatch[1] ?? "", decodeURIComponent(leaderboardInspectMatch[2] ?? ""), url);
                return;
            }
            const leaderboardFormulaMatch = /^\/v1\/admin\/leaderboards\/([^/]+)\/formula$/.exec(normalizedPath);
            if (leaderboardFormulaMatch && req.method === "PUT" && leaderboardHandlers) {
                await leaderboardHandlers.tune(req, res, leaderboardFormulaMatch[1] ?? "");
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/accomplishments/catalog" && accomplishmentsHandlers) {
                await accomplishmentsHandlers.catalog(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/accomplishments/summary" && accomplishmentsHandlers) {
                await accomplishmentsHandlers.summary(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/accomplishments/events" && accomplishmentsHandlers) {
                await accomplishmentsHandlers.recordEvent(req, res);
                return;
            }
            if (req.method === "PUT" && normalizedPath === "/v1/accomplishments/featured" && accomplishmentsHandlers) {
                await accomplishmentsHandlers.updateFeatured(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/gamification/summary" && gamificationControlHandlers) {
                await gamificationControlHandlers.summary(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/gamification/events" && gamificationControlHandlers) {
                await gamificationControlHandlers.processEvent(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/gamification/rules/draft" && gamificationControlHandlers) {
                await gamificationControlHandlers.createDraft(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/gamification/rules/publish" && gamificationControlHandlers) {
                await gamificationControlHandlers.publish(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/gamification/recompute" && gamificationControlHandlers) {
                await gamificationControlHandlers.recompute(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/admin/gamification/snapshot" && gamificationControlHandlers) {
                await gamificationControlHandlers.adminSnapshot(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/admin/gamification/explain" && gamificationControlHandlers) {
                await gamificationControlHandlers.explainDecision(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/challenges" && challengesHandlers) {
                await challengesHandlers.list(req, res, url);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/challenges/summary" && challengesHandlers) {
                await challengesHandlers.summary(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/challenges/quest-hub" && challengesHandlers) {
                await challengesHandlers.questHub(req, res, url);
                return;
            }
            if (req.method === "PUT" && normalizedPath === "/v1/admin/challenges" && challengesHandlers) {
                await challengesHandlers.upsert(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/challenges/events" && challengesHandlers) {
                await challengesHandlers.recordEvent(req, res);
                return;
            }
            const challengeDetailMatch = /^\/v1\/challenges\/([^/]+)$/.exec(normalizedPath);
            if (challengeDetailMatch && req.method === "GET" && challengesHandlers) {
                await challengesHandlers.detail(req, res, decodeURIComponent(challengeDetailMatch[1] ?? ""));
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/notifications" && notificationHandlers) {
                await notificationHandlers.list(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/notifications/unread-count" && notificationHandlers) {
                await notificationHandlers.unreadCount(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/notifications/mark-all-read" && notificationHandlers) {
                await notificationHandlers.markAllRead(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/notifications/preferences" && notificationHandlers) {
                await notificationHandlers.getPreferences(req, res);
                return;
            }
            const notificationMarkReadMatch = /^\/v1\/notifications\/([^/]+)\/read$/.exec(normalizedPath);
            if (notificationMarkReadMatch && req.method === "POST" && notificationHandlers) {
                await notificationHandlers.markRead(req, res, decodeURIComponent(notificationMarkReadMatch[1] ?? ""));
                return;
            }
            const notificationPreferenceMatch = /^\/v1\/notifications\/preferences\/([^/]+)$/.exec(normalizedPath);
            if (notificationPreferenceMatch && req.method === "PUT" && notificationHandlers) {
                await notificationHandlers.updatePreference(req, res, decodeURIComponent(notificationPreferenceMatch[1] ?? ""));
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/notifications/device-tokens" && notificationHandlers) {
                await notificationHandlers.registerDeviceToken(req, res);
                return;
            }
            if (req.method === "DELETE" && normalizedPath === "/v1/notifications/device-tokens" && notificationHandlers) {
                await notificationHandlers.unregisterDeviceToken(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/notifications/device-tokens" && notificationHandlers) {
                await notificationHandlers.listDeviceTokens(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/notifications/metrics" && notificationHandlers) {
                await notificationHandlers.metrics(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/collaboration/invites" && collaborationHandlers) {
                await collaborationHandlers.createInvite(req, res);
                return;
            }
            const businessInvitesMatch = /^\/v1\/business\/([^/]+)\/collaboration\/invites$/.exec(normalizedPath);
            if (businessInvitesMatch && req.method === "GET" && collaborationHandlers) {
                await collaborationHandlers.listBusinessInvites(req, res, decodeURIComponent(businessInvitesMatch[1] ?? ""));
                return;
            }
            const creatorInvitesMatch = /^\/v1\/creator\/profiles\/([^/]+)\/collaboration\/invites$/.exec(normalizedPath);
            if (creatorInvitesMatch && req.method === "GET" && collaborationHandlers) {
                await collaborationHandlers.listCreatorInvites(req, res, decodeURIComponent(creatorInvitesMatch[1] ?? ""));
                return;
            }
            const inviteRespondMatch = /^\/v1\/collaboration\/invites\/([^/]+)\/respond$/.exec(normalizedPath);
            if (inviteRespondMatch && req.method === "POST" && collaborationHandlers) {
                await collaborationHandlers.respondToInvite(req, res, decodeURIComponent(inviteRespondMatch[1] ?? ""));
                return;
            }
            const campaignStatusMatch = /^\/v1\/collaboration\/campaigns\/([^/]+)\/status$/.exec(normalizedPath);
            if (campaignStatusMatch && req.method === "POST" && collaborationHandlers) {
                await collaborationHandlers.transitionCampaign(req, res, decodeURIComponent(campaignStatusMatch[1] ?? ""));
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/collaboration/campaign-content-links" && collaborationHandlers) {
                await collaborationHandlers.linkCampaignContent(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/collaboration/featured-content" && collaborationHandlers) {
                await collaborationHandlers.addFeaturedPlacement(req, res);
                return;
            }
            const featuredForPlaceMatch = /^\/places\/([^/]+)\/featured-creator-content$/.exec(normalizedPath);
            if (featuredForPlaceMatch && req.method === "GET" && collaborationHandlers) {
                await collaborationHandlers.listFeaturedForPlace(req, res, decodeURIComponent(featuredForPlaceMatch[1] ?? ""));
                return;
            }
            if (businessAnalyticsHandlers && req.method === "POST" && normalizedPath === "/v1/business/analytics/events") {
                await businessAnalyticsHandlers.trackEvent(req, res);
                return;
            }
            const businessAnalyticsMatch = /^\/v1\/business\/profiles\/([^/]+)\/analytics\/dashboard$/.exec(normalizedPath);
            if (businessAnalyticsHandlers && req.method === "GET" && businessAnalyticsMatch) {
                await businessAnalyticsHandlers.dashboard(req, res, decodeURIComponent(businessAnalyticsMatch[1] ?? ""));
                return;
            }
            if (rankingTuningHandlers && normalizedPath === "/v1/admin/ranking/configs" && req.method === "GET") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.list(req, res);
                return;
            }
            if (rankingTuningHandlers && normalizedPath === "/v1/admin/ranking/configs" && req.method === "POST") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.createDraft(req, res);
                return;
            }
            const rankingConfigMatch = /^\/v1\/admin\/ranking\/configs\/([^/]+)$/.exec(normalizedPath);
            if (rankingTuningHandlers && rankingConfigMatch && req.method === "PATCH") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.updateDraft(req, res, decodeURIComponent(rankingConfigMatch[1] ?? ""));
                return;
            }
            const rankingValidateMatch = /^\/v1\/admin\/ranking\/configs\/([^/]+)\/validate$/.exec(normalizedPath);
            if (rankingTuningHandlers && rankingValidateMatch && req.method === "POST") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.validate(req, res, decodeURIComponent(rankingValidateMatch[1] ?? ""));
                return;
            }
            const rankingPublishMatch = /^\/v1\/admin\/ranking\/configs\/([^/]+)\/publish$/.exec(normalizedPath);
            if (rankingTuningHandlers && rankingPublishMatch && req.method === "POST") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.publish(req, res, decodeURIComponent(rankingPublishMatch[1] ?? ""));
                return;
            }
            if (rankingTuningHandlers && normalizedPath === "/v1/admin/ranking/rollback" && req.method === "POST") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.rollback(req, res);
                return;
            }
            if (rankingTuningHandlers && normalizedPath === "/v1/admin/ranking/audit" && req.method === "GET") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.audit(req, res);
                return;
            }
            if (rankingTuningHandlers && normalizedPath === "/v1/admin/ranking/preview" && req.method === "POST") {
                if (!rankingTuningHandlers.ensureAdmin(req, res))
                    return;
                await rankingTuningHandlers.preview(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/geo/search") {
                logGeoRouteMatch(req.method, url.pathname, normalizedPath);
                await geoHandlers.apiSearch(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/geo/reverse") {
                logGeoRouteMatch(req.method, url.pathname, normalizedPath);
                await geoHandlers.apiReverse(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/geo/autocomplete") {
                logGeoRouteMatch(req.method, url.pathname, normalizedPath);
                await geoHandlers.apiAutocomplete(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/geo/nearby") {
                logGeoRouteMatch(req.method, url.pathname, normalizedPath);
                await geoHandlers.apiNearby(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/geo/health") {
                logGeoRouteMatch(req.method, url.pathname, normalizedPath);
                await geoHandlers.health(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/geo/debug/status") {
                logGeoRouteMatch(req.method, url.pathname, normalizedPath);
                await geoHandlers.debugStatus(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/geocode") {
                await geoHandlers.geocode(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/geocode") {
                await geoHandlers.geocode(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/reverse-geocode") {
                await geoHandlers.reverseGeocode(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/reverse-geocode") {
                await geoHandlers.reverseGeocode(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/autocomplete") {
                await geoHandlers.autocomplete(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/place-lookup") {
                await geoHandlers.placeLookup(req, res);
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/area-context") {
                await geoHandlers.areaContext(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/geocoding/health") {
                await geoHandlers.health(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/health") {
                const geoMode = deps?.geoStatus?.mode ?? (deps?.geoGateway ? "custom" : "disabled");
                const geoValidationErrors = deps?.geoStatus?.validationErrors ?? [];
                const geoValidationWarnings = deps?.geoStatus?.validationWarnings ?? [];
                const geoConfigured = Boolean(deps?.geoGateway);
                const geoHealthy = geoMode === "disabled"
                    ? true
                    : geoConfigured && geoValidationErrors.length === 0;
                const overallOk = true;
                sendJson(res, 200, {
                    ok: overallOk,
                    service: "perbug-api",
                    version: "1.0.0",
                    time: new Date().toISOString(),
                    dependencies: {
                        geo: {
                            mode: geoMode,
                            configured: geoConfigured,
                            healthy: geoHealthy,
                            required: false,
                            degraded: !geoHealthy,
                            upstreamBaseUrl: deps?.geoStatus?.upstreamBaseUrl ?? null,
                            validationErrors: geoValidationErrors,
                            validationWarnings: geoValidationWarnings
                        }
                    }
                });
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/search") {
                await discoveryHandlers.search(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/browse") {
                await discoveryHandlers.browse(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/nearby") {
                await discoveryHandlers.nearby(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/trending") {
                await discoveryHandlers.trending(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/recommendations") {
                await discoveryHandlers.recommendations(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/feed") {
                await discoveryHandlers.feed(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/premium/experience") {
                await discoveryHandlers.premiumExperienceState(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/premium/modules") {
                await discoveryHandlers.premiumDiscoveryModules(req, res);
                return;
            }
            if (analyticsHandlers && req.method === "POST" && normalizedPath === "/v1/analytics/events") {
                await analyticsHandlers.ingest(req, res);
                return;
            }
            if (analyticsHandlers && req.method === "GET" && normalizedPath === "/v1/analytics/admin/overview") {
                await analyticsHandlers.adminOverview(req, res);
                return;
            }
            const creatorAnalyticsMatch = /^\/v1\/analytics\/creators\/([^/]+)\/overview$/.exec(normalizedPath);
            if (analyticsHandlers && req.method === "GET" && creatorAnalyticsMatch) {
                await analyticsHandlers.creatorOverview(req, res, decodeURIComponent(creatorAnalyticsMatch[1] ?? ""));
                return;
            }
            const analyticsBusinessMatch = /^\/v1\/analytics\/businesses\/([^/]+)\/overview$/.exec(normalizedPath);
            if (analyticsHandlers && req.method === "GET" && analyticsBusinessMatch) {
                await analyticsHandlers.businessOverview(req, res, decodeURIComponent(analyticsBusinessMatch[1] ?? ""));
                return;
            }
            const relatedPlacesMatch = /^\/v1\/discovery\/places\/([^/]+)\/related$/.exec(normalizedPath);
            if (discoveryHandlers && req.method === "GET" && relatedPlacesMatch) {
                await discoveryHandlers.relatedPlaces(req, res, decodeURIComponent(relatedPlacesMatch[1] ?? ""));
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/suggested-creators") {
                await discoveryHandlers.suggestedCreators(req, res);
                return;
            }
            if (discoveryHandlers && req.method === "GET" && normalizedPath === "/v1/discovery/suggested-guides") {
                await discoveryHandlers.suggestedGuides(req, res);
                return;
            }
            const cityPageMatch = /^\/v1\/discovery\/cities\/([^/]+)$/.exec(normalizedPath);
            if (discoveryHandlers && req.method === "GET" && cityPageMatch) {
                await discoveryHandlers.cityPage(req, res, decodeURIComponent(cityPageMatch[1] ?? ""));
                return;
            }
            const businessPremiumStateMatch = /^\/v1\/businesses\/([^/]+)\/premium$/.exec(normalizedPath);
            if (businessPremiumHandlers && req.method === "GET" && businessPremiumStateMatch) {
                await businessPremiumHandlers.getPremiumState(req, res, decodeURIComponent(businessPremiumStateMatch[1] ?? ""));
                return;
            }
            if (businessPremiumHandlers && req.method === "PATCH" && businessPremiumStateMatch) {
                await businessPremiumHandlers.setTier(req, res, decodeURIComponent(businessPremiumStateMatch[1] ?? ""));
                return;
            }
            const businessFeaturedMatch = /^\/v1\/businesses\/([^/]+)\/featured-placement$/.exec(normalizedPath);
            if (businessPremiumHandlers && req.method === "PATCH" && businessFeaturedMatch) {
                await businessPremiumHandlers.updateFeaturedPlacementSettings(req, res, decodeURIComponent(businessFeaturedMatch[1] ?? ""));
                return;
            }
            const businessProfileEnhancedMatch = /^\/v1\/businesses\/([^/]+)\/enhanced-profile$/.exec(normalizedPath);
            if (businessPremiumHandlers && req.method === "PATCH" && businessProfileEnhancedMatch) {
                await businessPremiumHandlers.updateEnhancedProfile(req, res, decodeURIComponent(businessProfileEnhancedMatch[1] ?? ""));
                return;
            }
            const businessCampaignCreateMatch = /^\/v1\/businesses\/([^/]+)\/campaigns$/.exec(normalizedPath);
            if (businessPremiumHandlers && req.method === "POST" && businessCampaignCreateMatch) {
                await businessPremiumHandlers.createCampaign(req, res, decodeURIComponent(businessCampaignCreateMatch[1] ?? ""));
                return;
            }
            if (outingPlannerHandlers && req.method === "POST" && normalizedPath === "/v1/outing-planner/create") {
                await outingPlannerHandlers.createPlan(req, res);
                return;
            }
            if (outingPlannerHandlers && req.method === "POST" && normalizedPath === "/v1/outing-planner/save") {
                await outingPlannerHandlers.savePlan(req, res);
                return;
            }
            if (outingPlannerHandlers && req.method === "GET" && normalizedPath === "/v1/outing-planner/saved") {
                await outingPlannerHandlers.listSaved(req, res);
                return;
            }
            const outingSavedMatch = /^\/v1\/outing-planner\/saved\/([^/]+)$/.exec(normalizedPath);
            if (outingPlannerHandlers && req.method === "GET" && outingSavedMatch) {
                await outingPlannerHandlers.getSaved(req, res, decodeURIComponent(outingSavedMatch[1] ?? ""));
                return;
            }
            if (outingPlannerHandlers && req.method === "PATCH" && outingSavedMatch) {
                await outingPlannerHandlers.patchSaved(req, res, decodeURIComponent(outingSavedMatch[1] ?? ""));
                return;
            }
            if (outingPlannerHandlers && req.method === "DELETE" && outingSavedMatch) {
                await outingPlannerHandlers.deleteSaved(req, res, decodeURIComponent(outingSavedMatch[1] ?? ""));
                return;
            }
            if (outingPlannerHandlers && req.method === "POST" && normalizedPath === "/v1/outing-planner/regenerate") {
                await outingPlannerHandlers.regenerate(req, res);
                return;
            }
            if (outingPlannerHandlers && req.method === "GET" && normalizedPath === "/v1/outing-planner/usage") {
                await outingPlannerHandlers.usage(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/plans") {
                const lat = parseRequiredNumber(url.searchParams, "lat");
                const lng = parseRequiredNumber(url.searchParams, "lng");
                const radius = Number(url.searchParams.get("radius") ?? "2500");
                const limit = Number(url.searchParams.get("limit") ?? "20");
                const category = url.searchParams.get("category") ?? "food";
                const searchPlan = buildCategorySearchPlan(category);
                const primaryPlaces = await searchNearby({
                    lat,
                    lng,
                    radiusMeters: radius,
                    maxResults: limit,
                    includedTypes: searchPlan.primaryTypes
                });
                const combinedPlaces = [...primaryPlaces];
                const sourcePriority = new Map();
                for (const place of primaryPlaces) {
                    sourcePriority.set(place.id, 8);
                }
                if (combinedPlaces.length < limit && searchPlan.fallbackTypes.length > 0) {
                    const fallbackPlaces = await searchNearby({
                        lat,
                        lng,
                        radiusMeters: radius,
                        maxResults: Math.max(4, Math.min(limit, 12)),
                        includedTypes: searchPlan.fallbackTypes
                    });
                    for (const place of fallbackPlaces) {
                        if (!sourcePriority.has(place.id)) {
                            combinedPlaces.push(place);
                            sourcePriority.set(place.id, 0);
                        }
                    }
                }
                const definition = getCategoryDefinition(category);
                const filtered = rankAndFilterCategoryResults(combinedPlaces, definition, { sourcePriority });
                const places = filtered.kept.slice(0, limit);
                logCategoryDiagnostics({
                    category,
                    queryTerms: searchPlan.queryTerms,
                    includedTypes: [...searchPlan.primaryTypes, ...searchPlan.fallbackTypes],
                    returnedCount: combinedPlaces.length,
                    filteredOutCount: filtered.rejected.length,
                    scoreMap: filtered.scoreMap,
                    rejected: filtered.rejected
                });
                const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? DEFAULT_PUBLIC_API_BASE_URL;
                const plans = places.map((place) => {
                    const photoName = place.photos?.[0]?.name;
                    return {
                        id: `google:${place.id}`,
                        title: place.displayName?.text ?? "Untitled place",
                        category,
                        source: "google",
                        placeId: place.id,
                        address: place.formattedAddress,
                        lat: place.location?.latitude,
                        lng: place.location?.longitude,
                        rating: place.rating,
                        userRatingCount: place.userRatingCount,
                        priceLevel: place.priceLevel,
                        googleMapsUri: place.googleMapsUri,
                        websiteUri: place.websiteUri,
                        photo: photoName,
                        photoUrl: photoName ? `${publicApiBaseUrl}/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=800` : undefined
                    };
                });
                sendJson(res, 200, plans);
                return;
            }
            const placeDetailMatch = /^\/places\/([^/]+)$/.exec(normalizedPath);
            if (req.method === "GET" && placeDetailMatch) {
                const placeId = decodeURIComponent(placeDetailMatch[1] ?? "");
                const place = await fetchPlaceDetail(placeId);
                const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? DEFAULT_PUBLIC_API_BASE_URL;
                const photos = (place.photos ?? [])
                    .map((photo, index) => {
                    if (!photo.name) {
                        return undefined;
                    }
                    const encoded = encodeURIComponent(photo.name);
                    return {
                        id: `google:${photo.name}`,
                        name: photo.name,
                        token: photo.name,
                        sourceProvider: "google_places",
                        sourceType: "provider",
                        provider: "google_places",
                        thumbnailUrl: `${publicApiBaseUrl}/photo?name=${encoded}&maxWidthPx=240&maxHeightPx=240`,
                        mediumUrl: `${publicApiBaseUrl}/photo?name=${encoded}&maxWidthPx=800&maxHeightPx=600`,
                        largeUrl: `${publicApiBaseUrl}/photo?name=${encoded}&maxWidthPx=1200&maxHeightPx=900`,
                        fullUrl: `${publicApiBaseUrl}/photo?name=${encoded}&maxWidthPx=1600&maxHeightPx=1200`,
                        url: `${publicApiBaseUrl}/photo?name=${encoded}&maxWidthPx=1200&maxHeightPx=900`,
                        width: photo.widthPx,
                        height: photo.heightPx,
                        isPrimary: index === 0,
                        sortOrder: index,
                        rankScore: (photo.widthPx ?? 0) * (photo.heightPx ?? 0),
                        attributionText: photo.authorAttributions?.[0]?.displayName,
                        status: "active"
                    };
                })
                    .filter((photo) => Boolean(photo));
                sendJson(res, 200, {
                    id: place.id,
                    title: place.displayName?.text,
                    description: place.editorialSummary?.text,
                    address: place.formattedAddress,
                    lat: place.location?.latitude,
                    lng: place.location?.longitude,
                    rating: place.rating,
                    userRatingCount: place.userRatingCount,
                    priceLevel: place.priceLevel,
                    googleMapsUri: place.googleMapsUri,
                    websiteUri: place.websiteUri,
                    phone: place.nationalPhoneNumber,
                    openingHoursText: place.regularOpeningHours?.weekdayDescriptions,
                    photos,
                    photo: photos[0]?.name,
                    photoUrl: photos[0]?.url
                });
                return;
            }
            const reviewMediaUploadMatch = /^\/v1\/reviews\/media\/uploads$/.exec(normalizedPath);
            if (reviewMediaUploadMatch && req.method === "POST" && deps?.reviewsStore) {
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const fileName = String(payload.fileName ?? "upload").trim();
                const mimeType = String(payload.mimeType ?? "").trim().toLowerCase();
                const base64Data = payload.base64Data == null ? undefined : String(payload.base64Data).trim();
                const mediaType = String(payload.mediaType ?? (mimeType.startsWith("video/") ? "video" : "photo")).trim();
                const fileSizeBytes = payload.fileSizeBytes == null ? undefined : Number(payload.fileSizeBytes);
                const durationMs = payload.durationMs == null ? undefined : Number(payload.durationMs);
                const width = payload.width == null ? undefined : Number(payload.width);
                const height = payload.height == null ? undefined : Number(payload.height);
                if (deps?.accessEngine && deps?.subscriptionService) {
                    const actor = deps?.accountsService
                        ? deps.accountsService.resolveActingContext(userIdHeader)
                        : { userId: userIdHeader, profileType: ProfileType.PERSONAL, profileId: userIdHeader, roles: [] };
                    const resolvedTarget = deps?.accountsService
                        ? deps.accountsService.resolveSubscriptionTarget(actor)
                        : { accountId: userIdHeader, accountType: "USER" };
                    const target = { targetId: resolvedTarget.accountId, targetType: resolvedTarget.accountType };
                    deps.subscriptionService.ensureAccount(target.targetId, target.targetType);
                    const canUpload = await deps.accessEngine.checkFeatureAccess(target, mediaType === "video" ? FEATURE_KEYS.UPLOAD_VIDEOS : FEATURE_KEYS.UPLOAD_PHOTOS);
                    if (!canUpload.allowed) {
                        sendJson(res, 403, { access: canUpload });
                        return;
                    }
                }
                await track({ eventName: "video_upload_started", mediaId: fileName, metadata: { mediaType, mimeType, fileSizeBytes } }, { actorUserId: userIdHeader, sourceRoute: "/v1/reviews/media/uploads" });
                const upload = await deps.reviewsStore.createMediaUpload({ ownerUserId: userIdHeader, mediaType, fileName, mimeType, base64Data, fileSizeBytes, durationMs, width, height });
                sendJson(res, 201, { upload });
                return;
            }
            const reviewMediaUploadFinalizeMatch = /^\/v1\/reviews\/media\/uploads\/([^/]+)\/finalize$/.exec(normalizedPath);
            if (reviewMediaUploadFinalizeMatch && req.method === "POST" && deps?.reviewsStore) {
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const uploadId = decodeURIComponent(reviewMediaUploadFinalizeMatch[1] ?? "");
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const upload = await deps.reviewsStore.finalizeMediaUpload({
                    uploadId,
                    ownerUserId: userIdHeader,
                    fileSizeBytes: payload.fileSizeBytes == null ? undefined : Number(payload.fileSizeBytes),
                    durationMs: payload.durationMs == null ? undefined : Number(payload.durationMs),
                    width: payload.width == null ? undefined : Number(payload.width),
                    height: payload.height == null ? undefined : Number(payload.height),
                    checksum: payload.checksum == null ? undefined : String(payload.checksum)
                });
                await track({ eventName: "video_upload_completed", mediaId: upload.id, success: true, metadata: { mediaType: upload.mediaType } }, { actorUserId: userIdHeader, sourceRoute: "/v1/reviews/media/uploads/:id/finalize" });
                sendJson(res, 200, { upload });
                return;
            }
            const reviewsMatch = /^\/places\/([^/]+)\/reviews$/.exec(normalizedPath);
            const reviewEligibilityMatch = /^\/places\/([^/]+)\/review-eligibility$/.exec(normalizedPath);
            if (reviewEligibilityMatch && req.method === "POST") {
                const placeId = decodeURIComponent(reviewEligibilityMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader) {
                    throw new ValidationError(["x-user-id header is required"]);
                }
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const location = parseLocationProof(payload.locationProof ?? payload.location);
                const place = deps?.placeService?.listCanonicalPlaces().find((item) => item.canonicalPlaceId === placeId) ?? null;
                const recentReviews = await deps?.reviewsStore?.listByAuthorProfile({
                    authorProfileType: "PERSONAL",
                    authorProfileId: userIdHeader,
                    viewerUserId: userIdHeader,
                    limit: 20
                });
                const eligibility = reviewEligibilityService.evaluate({
                    userId: userIdHeader,
                    place,
                    location,
                    recentReviews: recentReviews ?? []
                });
                sendJson(res, 200, { placeId, policyVersion: reviewEligibilityService.getPolicy().version, eligibility });
                return;
            }
            if (req.method === "POST" && (normalizedPath === "/v1/reviews/eligibility/map" || normalizedPath === "/reviews/eligibility/map")) {
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const location = parseLocationProof(payload.locationProof ?? payload.location);
                const placeIds = Array.isArray(payload.placeIds) ? payload.placeIds.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 250) : [];
                const placesById = new Map((deps?.placeService?.listCanonicalPlaces() ?? []).map((place) => [place.canonicalPlaceId, place]));
                const results = placeIds.map((placeId) => ({
                    placeId,
                    eligibility: reviewEligibilityService.evaluate({ userId: userIdHeader, place: placesById.get(placeId) ?? null, location })
                }));
                sendJson(res, 200, { placeIds, results, policyVersion: reviewEligibilityService.getPolicy().version });
                return;
            }
            if (reviewsMatch && deps?.reviewsStore) {
                const placeId = decodeURIComponent(reviewsMatch[1] ?? "");
                if (req.method === "GET") {
                    const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                    const sort = String(url.searchParams.get("sort") ?? "most_helpful");
                    const cursor = String(url.searchParams.get("cursor") ?? "").trim() || undefined;
                    const limit = Number(url.searchParams.get("limit") ?? "20");
                    const trustedOnly = String(url.searchParams.get("trustedOnly") ?? "false") === "true";
                    const verifiedOnly = String(url.searchParams.get("verifiedOnly") ?? "false") === "true";
                    const result = await deps.reviewsStore.listByPlace({
                        placeId,
                        viewerUserId: userIdHeader || undefined,
                        sort: sort,
                        cursor,
                        limit,
                        trustedOnly,
                        verifiedOnly
                    });
                    await track({ eventName: "review_viewed", placeId, metadata: { count: result.reviews.length, sort } }, { actorUserId: userIdHeader || undefined, sourceRoute: "/places/:id/reviews" });
                    sendJson(res, 200, result);
                    return;
                }
                if (req.method === "POST") {
                    const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                    if (!userIdHeader) {
                        throw new ValidationError(["x-user-id header is required"]);
                    }
                    let actor = {
                        userId: userIdHeader,
                        profileType: ProfileType.PERSONAL,
                        profileId: userIdHeader,
                        roles: []
                    };
                    if (deps?.accountsService) {
                        const requestedProfileType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
                        const requestedProfileId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
                        actor = deps.accountsService.resolveActingContext(userIdHeader, requestedProfileType && requestedProfileId
                            ? { profileType: requestedProfileType, profileId: requestedProfileId }
                            : undefined);
                    }
                    const body = await parseJsonBody(req);
                    if (!body || typeof body !== "object" || Array.isArray(body)) {
                        throw new ValidationError(["body must be a JSON object"], "Invalid review payload");
                    }
                    const payload = body;
                    const locationProof = parseLocationProof(payload.locationProof ?? payload.location);
                    const videoPayload = payload.video && typeof payload.video === "object" ? payload.video : undefined;
                    const mediaUploadIds = Array.isArray(payload.mediaUploadIds) ? payload.mediaUploadIds.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
                    const place = deps?.placeService?.listCanonicalPlaces().find((item) => item.canonicalPlaceId === placeId) ?? null;
                    const hasLocationFix = locationProof.lat != null && locationProof.lng != null;
                    const recentReviews = await deps.reviewsStore.listByAuthorProfile({
                        authorProfileType: "PERSONAL",
                        authorProfileId: userIdHeader,
                        viewerUserId: userIdHeader,
                        limit: 20
                    });
                    const eligibility = (!hasLocationFix && !place)
                        ? {
                            allowed: true,
                            reasonCode: "allowed",
                            requiresFreshLocation: false,
                            requiresPermission: false,
                            requiresCheckIn: false,
                            message: "Legacy place review accepted without proximity enforcement.",
                            riskFlags: ["legacy_place_without_coordinates"]
                        }
                        : reviewEligibilityService.evaluate({
                            userId: userIdHeader,
                            place,
                            location: locationProof,
                            recentReviews
                        });
                    if (!eligibility.allowed) {
                        sendJson(res, 403, { error: "review_locked_by_policy", eligibility });
                        return;
                    }
                    if (deps?.accessEngine && deps?.subscriptionService) {
                        const resolvedTarget = deps?.accountsService
                            ? deps.accountsService.resolveSubscriptionTarget(actor)
                            : { accountId: userIdHeader, accountType: "USER" };
                        const target = { targetId: resolvedTarget.accountId, targetType: resolvedTarget.accountType };
                        deps.subscriptionService.ensureAccount(target.targetId, target.targetType);
                        const featureDecision = await deps.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.REVIEWS_WRITE);
                        if (!featureDecision.allowed) {
                            sendJson(res, 403, { access: featureDecision });
                            return;
                        }
                        const dailyQuota = await deps.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.REVIEWS_WRITE_PER_DAY, 1);
                        if (!dailyQuota.allowed) {
                            sendJson(res, 403, { error: "USAGE_LIMIT_REACHED", access: dailyQuota });
                            return;
                        }
                        const monthlyQuota = await deps.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.REVIEWS_WRITE_PER_MONTH, 1);
                        if (!monthlyQuota.allowed) {
                            sendJson(res, 403, { error: "USAGE_LIMIT_REACHED", access: monthlyQuota });
                            return;
                        }
                        if (mediaUploadIds.length > 0) {
                            const perReviewPhotoQuota = await deps.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.UPLOAD_PHOTOS_PER_PLACE, mediaUploadIds.length);
                            if (!perReviewPhotoQuota.allowed) {
                                sendJson(res, 403, { error: "USAGE_LIMIT_REACHED", access: { ...perReviewPhotoQuota, denialReason: "upload_limit_reached" } });
                                return;
                            }
                            const monthlyPhotoQuota = await deps.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.UPLOAD_PHOTOS_PER_MONTH, mediaUploadIds.length);
                            if (!monthlyPhotoQuota.allowed) {
                                sendJson(res, 403, { error: "USAGE_LIMIT_REACHED", access: { ...monthlyPhotoQuota, denialReason: "upload_limit_reached" } });
                                return;
                            }
                        }
                        if (videoPayload) {
                            const reviewVideoDecision = await deps.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.REVIEWS_VIDEO_WRITE);
                            if (!reviewVideoDecision.allowed) {
                                sendJson(res, 403, { access: { ...reviewVideoDecision, denialReason: "review_privilege_required" } });
                                return;
                            }
                            const durationSeconds = Number(videoPayload.durationSeconds ?? 0);
                            const sizeMb = Number(videoPayload.sizeMb ?? 0);
                            const durationQuota = await deps.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.UPLOAD_VIDEO_DURATION_SECONDS, durationSeconds || 0);
                            if (!durationQuota.allowed) {
                                sendJson(res, 403, { error: "USAGE_LIMIT_REACHED", access: { ...durationQuota, denialReason: "video_limit_reached", submittedDurationSeconds: durationSeconds } });
                                return;
                            }
                            const sizeQuota = await deps.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.UPLOAD_VIDEO_SIZE_MB, sizeMb || 0);
                            if (!sizeQuota.allowed) {
                                sendJson(res, 403, { error: "USAGE_LIMIT_REACHED", access: { ...sizeQuota, denialReason: "video_limit_reached", submittedSizeMb: sizeMb } });
                                return;
                            }
                        }
                    }
                    else if (deps?.entitlementPolicy && deps?.subscriptionService) {
                        let subscriptionAccountId = userIdHeader;
                        let subscriptionAccountType = "USER";
                        if (deps?.accountsService) {
                            const target = deps.accountsService.resolveSubscriptionTarget(actor);
                            subscriptionAccountId = target.accountId;
                            subscriptionAccountType = target.accountType;
                        }
                        deps.subscriptionService.ensureAccount(subscriptionAccountId, subscriptionAccountType);
                        const decision = await deps.entitlementPolicy.can(subscriptionAccountId, "create_review");
                        if (!decision.allowed) {
                            sendJson(res, 403, { error: decision.reasonCode, message: decision.message, requiredPlan: decision.requiredPlan });
                            return;
                        }
                    }
                    if (deps?.accountsService && actor.profileType === ProfileType.BUSINESS) {
                        const replyDecision = deps.accountsService.authorizeAction(actor, PermissionAction.BUSINESS_REPLY);
                        if (!replyDecision.allowed) {
                            sendJson(res, 403, { decision: replyDecision });
                            return;
                        }
                    }
                    const rating = payload.rating == null ? undefined : Number(payload.rating);
                    const text = String(payload.body ?? payload.text ?? "").trim();
                    const userId = String(readHeader(req, "x-user-id") ?? payload.userId ?? "anonymous-user").trim();
                    const displayName = String(payload.displayName ?? "").trim() || "Perbug User";
                    if (rating != null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
                        throw new ValidationError(["rating must be between 1 and 5"], "Invalid review payload");
                    }
                    if (text.length > 1000 || (text.length < 5 && mediaUploadIds.length === 0)) {
                        throw new ValidationError(["text length must be between 5 and 1000 characters unless media is attached"], "Invalid review payload");
                    }
                    const created = await deps.reviewsStore.createOrReplace({
                        placeId,
                        canonicalPlaceId: placeId,
                        authorUserId: userId,
                        authorProfileType: actor.profileType,
                        authorProfileId: actor.profileId,
                        authorDisplayName: displayName,
                        rating: typeof rating === "number" ? Math.round(rating) : undefined,
                        body: text,
                        mediaUploadIds,
                        editWindowMinutes: Number(process.env.REVIEW_EDIT_WINDOW_MINUTES ?? 30),
                        eligibilitySnapshot: {
                            reviewEligibilityVersion: reviewEligibilityService.getPolicy().version,
                            submitDistanceMeters: eligibility.distanceMeters,
                            locationAccuracyMeters: locationProof.accuracyMeters,
                            locationTimestamp: locationProof.capturedAt,
                            thresholdMeters: eligibility.thresholdMeters,
                            verificationMode: locationProof.isMocked ? "proximity_with_risk" : "proximity",
                            reasonCodeAtSubmit: eligibility.reasonCode,
                            fraudFlags: eligibility.riskFlags
                        }
                    });
                    if (deps.moderationService) {
                        await deps.moderationService.analyzeContent({
                            target: { targetType: "review", targetId: created.id, reviewId: created.id, subjectUserId: userId, placeId: created.placeId },
                            text,
                            actorUserId: userId,
                            metadata: { rating: created.rating, mediaCount: mediaUploadIds.length }
                        });
                        for (const media of created.media) {
                            await deps.moderationService.analyzeContent({
                                target: { targetType: "review_media", targetId: media.id, reviewId: created.id, mediaId: media.id, subjectUserId: userId, placeId: created.placeId },
                                caption: media.caption,
                                title: media.caption,
                                actorUserId: userId,
                                metadata: {
                                    mimeType: media.mimeType,
                                    checksum: media.checksum,
                                    hasPoster: Boolean(media.posterUrl),
                                    hasThumbnail: Boolean(media.variants.thumbnailUrl)
                                }
                            });
                        }
                    }
                    if (deps?.accessEngine && deps?.subscriptionService) {
                        const resolvedTarget = deps?.accountsService
                            ? deps.accountsService.resolveSubscriptionTarget(actor)
                            : { accountId: userIdHeader, accountType: "USER" };
                        const target = { targetId: resolvedTarget.accountId, targetType: resolvedTarget.accountType };
                        await deps.accessEngine.consumeQuota(target, QUOTA_KEYS.REVIEWS_WRITE_PER_DAY, 1);
                        await deps.accessEngine.consumeQuota(target, QUOTA_KEYS.REVIEWS_WRITE_PER_MONTH, 1);
                        if (mediaUploadIds.length > 0) {
                            await deps.accessEngine.consumeQuota(target, QUOTA_KEYS.UPLOAD_PHOTOS_PER_PLACE, mediaUploadIds.length);
                            await deps.accessEngine.consumeQuota(target, QUOTA_KEYS.UPLOAD_PHOTOS_PER_MONTH, mediaUploadIds.length);
                        }
                        if (videoPayload) {
                            await deps.accessEngine.consumeQuota(target, QUOTA_KEYS.REVIEWS_VIDEO_PER_MONTH, 1);
                            await deps.accessEngine.consumeQuota(target, QUOTA_KEYS.UPLOAD_VIDEOS_PER_MONTH, 1);
                        }
                    }
                    else if (subscriptionHandlers) {
                        const usageAccountId = deps?.accountsService ? deps.accountsService.resolveSubscriptionTarget(actor).accountId : userId;
                        await subscriptionHandlers.recordReviewUsage(usageAccountId);
                    }
                    await track({ eventName: "review_submitted", placeId, reviewId: created.id, success: true, metadata: { rating: created.rating, mediaCount: created.media.length } }, { actorUserId: userId, actorProfileType: actor.profileType === ProfileType.BUSINESS ? "business" : actor.profileType === ProfileType.CREATOR ? "creator" : "user", actorProfileId: actor.profileId, sourceRoute: "/places/:id/reviews" });
                    if (created.media.some((m) => m.mediaType === "video")) {
                        await track({ eventName: "creator_media_engagement", placeId, reviewId: created.id, metadata: { mediaType: "video" } }, { actorUserId: userId, sourceRoute: "/places/:id/reviews" });
                    }
                    sendJson(res, 201, { review: created, created: true });
                    return;
                }
            }
            const reviewVideosMatch = /^\/places\/([^/]+)\/review-videos$/.exec(normalizedPath);
            if (reviewVideosMatch && req.method === "GET" && deps?.reviewsStore) {
                const placeId = decodeURIComponent(reviewVideosMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                const cursor = String(url.searchParams.get("cursor") ?? "").trim() || undefined;
                const filterRaw = String(url.searchParams.get("filter") ?? "all").trim();
                const filter = (["all", "creator", "user", "trusted", "verified"].includes(filterRaw) ? filterRaw : "all");
                const limit = Number(url.searchParams.get("limit") ?? "12");
                const section = await getPlaceReviewVideoSection(deps.reviewsStore, {
                    placeId,
                    viewerUserId: userIdHeader || undefined,
                    cursor,
                    limit,
                    filter
                });
                sendJson(res, 200, section);
                return;
            }
            const myReviewMatch = /^\/places\/([^/]+)\/reviews\/me$/.exec(normalizedPath);
            if (myReviewMatch && req.method === "GET" && deps?.reviewsStore) {
                const placeId = decodeURIComponent(myReviewMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const review = await deps.reviewsStore.getByPlaceAndAuthor(placeId, userIdHeader);
                sendJson(res, 200, { review });
                return;
            }
            const reviewDetailMatch = /^\/places\/([^/]+)\/reviews\/([^/]+)$/.exec(normalizedPath);
            if (reviewDetailMatch && deps?.reviewsStore) {
                const reviewId = decodeURIComponent(reviewDetailMatch[2] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (req.method === "PATCH") {
                    if (!userIdHeader)
                        throw new ValidationError(["x-user-id header is required"]);
                    const body = await parseJsonBody(req);
                    const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                    const text = payload.body == null ? undefined : String(payload.body).trim();
                    const rating = payload.rating == null ? undefined : Number(payload.rating);
                    const attachMediaUploadIds = Array.isArray(payload.attachMediaUploadIds) ? payload.attachMediaUploadIds.map((item) => String(item ?? "").trim()).filter(Boolean) : undefined;
                    const removeMediaIds = Array.isArray(payload.removeMediaIds) ? payload.removeMediaIds.map((item) => String(item ?? "").trim()).filter(Boolean) : undefined;
                    const mediaOrder = Array.isArray(payload.mediaOrder) ? payload.mediaOrder.map((item) => String(item ?? "").trim()).filter(Boolean) : undefined;
                    const primaryMediaId = payload.primaryMediaId == null ? undefined : String(payload.primaryMediaId).trim();
                    if (text != null && text.length > 1000) {
                        throw new ValidationError(["text length must be between 5 and 1000 characters"], "Invalid review payload");
                    }
                    const updated = await deps.reviewsStore.update({ reviewId, actorUserId: userIdHeader, body: text, rating, attachMediaUploadIds, removeMediaIds, mediaOrder, primaryMediaId });
                    await track({ eventName: "review_edited", reviewId: updated.id, placeId: updated.placeId }, { actorUserId: userIdHeader, sourceRoute: "/places/:placeId/reviews/:reviewId" });
                    sendJson(res, 200, { review: updated });
                    return;
                }
                if (req.method === "DELETE") {
                    if (!userIdHeader)
                        throw new ValidationError(["x-user-id header is required"]);
                    const deleted = await deps.reviewsStore.softDelete(reviewId, userIdHeader);
                    await track({ eventName: "review_deleted", reviewId: deleted.id, placeId: deleted.placeId }, { actorUserId: userIdHeader, sourceRoute: "/places/:placeId/reviews/:reviewId" });
                    sendJson(res, 200, { review: deleted });
                    return;
                }
            }
            const reviewTrustMatch = /^\/reviews\/([^/]+)\/trust$/.exec(normalizedPath);
            if (reviewTrustMatch && req.method === "GET" && deps?.reviewsStore) {
                const reviewId = decodeURIComponent(reviewTrustMatch[1] ?? "");
                const trustSignals = await deps.reviewsStore.getReviewTrustSignals(reviewId);
                sendJson(res, 200, { trustSignals });
                return;
            }
            const trustProfileMatch = /^\/v1\/trust\/reviewers\/([^/]+)$/.exec(normalizedPath);
            if (trustProfileMatch && req.method === "GET" && deps?.reviewsStore) {
                if (!assertAdmin(req)) {
                    sendJson(res, 403, { error: "admin key required" });
                    return;
                }
                const userId = decodeURIComponent(trustProfileMatch[1] ?? "");
                const profile = await deps.reviewsStore.getReviewerTrustProfile(userId);
                const audit = await deps.reviewsStore.listTrustAuditLogs(userId);
                sendJson(res, 200, { profile, audit });
                return;
            }
            const trustOverrideMatch = /^\/v1\/trust\/reviewers\/([^/]+)\/override$/.exec(normalizedPath);
            if (trustOverrideMatch && req.method === "POST" && deps?.reviewsStore) {
                if (!assertAdmin(req)) {
                    sendJson(res, 403, { error: "admin key required" });
                    return;
                }
                const userId = decodeURIComponent(trustOverrideMatch[1] ?? "");
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const status = String(payload.status ?? "").trim();
                const actorUserId = String(payload.actorUserId ?? "admin").trim();
                const profile = await deps.reviewsStore.applyTrustOverride({
                    userId,
                    actorUserId,
                    status: status,
                    reason: payload.reason == null ? undefined : String(payload.reason),
                    notes: payload.notes == null ? undefined : String(payload.notes)
                });
                sendJson(res, 200, { profile });
                return;
            }
            if (normalizedPath === "/v1/trust/evidence" && req.method === "POST" && deps?.reviewsStore) {
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const evidence = await deps.reviewsStore.upsertVerificationEvidence({
                    userId: payload.userId ? String(payload.userId) : userIdHeader,
                    placeId: String(payload.placeId ?? ""),
                    linkedReviewId: payload.linkedReviewId == null ? undefined : String(payload.linkedReviewId),
                    evidenceType: String(payload.evidenceType ?? "behavioral_heuristic"),
                    evidenceStrength: Number(payload.evidenceStrength ?? payload.confidenceScore ?? 10),
                    confidenceScore: payload.confidenceScore == null ? undefined : Number(payload.confidenceScore),
                    sourceType: payload.sourceType == null ? undefined : String(payload.sourceType),
                    sourceId: payload.sourceId == null ? undefined : String(payload.sourceId),
                    evidenceStatus: payload.evidenceStatus == null ? undefined : String(payload.evidenceStatus),
                    strengthLevel: payload.strengthLevel == null ? undefined : String(payload.strengthLevel),
                    observedAt: payload.observedAt == null ? undefined : String(payload.observedAt),
                    startsAt: payload.startsAt == null ? undefined : String(payload.startsAt),
                    endsAt: payload.endsAt == null ? undefined : String(payload.endsAt),
                    expiresAt: payload.expiresAt == null ? undefined : String(payload.expiresAt),
                    privacyClass: payload.privacyClass == null ? undefined : String(payload.privacyClass),
                    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : undefined
                });
                sendJson(res, 201, { evidence });
                return;
            }
            const verificationSummaryMatch = /^\/v1\/trust\/reviews\/([^/]+)\/verification$/.exec(normalizedPath);
            if (verificationSummaryMatch && req.method === "GET" && deps?.reviewsStore) {
                const reviewId = decodeURIComponent(verificationSummaryMatch[1] ?? "");
                const summary = await deps.reviewsStore.getReviewVerificationSummary(reviewId);
                sendJson(res, 200, { summary });
                return;
            }
            if (verificationSummaryMatch && req.method === "POST" && deps?.reviewsStore) {
                if (!assertAdmin(req)) {
                    sendJson(res, 403, { error: "admin key required" });
                    return;
                }
                const reviewId = decodeURIComponent(verificationSummaryMatch[1] ?? "");
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const actorUserId = String(payload.actorUserId ?? "admin").trim();
                const status = String(payload.status ?? "").trim();
                const summary = await deps.reviewsStore.applyReviewVerificationOverride({
                    reviewId,
                    actorUserId,
                    status: status,
                    reason: payload.reason == null ? undefined : String(payload.reason)
                });
                sendJson(res, 200, { summary });
                return;
            }
            if (normalizedPath === "/v1/trust/evidence/eligible" && req.method === "GET" && deps?.reviewsStore) {
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const placeId = String(url.searchParams.get("placeId") ?? "").trim();
                if (!placeId)
                    throw new ValidationError(["placeId is required"]);
                const reviewId = String(url.searchParams.get("reviewId") ?? "").trim() || undefined;
                const evidence = await deps.reviewsStore.listEligibleEvidenceForUser({ userId: userIdHeader, placeId, reviewId });
                sendJson(res, 200, { evidence });
                return;
            }
            if (normalizedPath === "/v1/trust/visit-sessions" && req.method === "POST" && deps?.reviewsStore) {
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const session = await deps.reviewsStore.createVisitSession({
                    userId: userIdHeader,
                    placeId: payload.placeId == null ? undefined : String(payload.placeId),
                    startedAt: String(payload.startedAt ?? new Date().toISOString()),
                    endedAt: payload.endedAt == null ? undefined : String(payload.endedAt),
                    confidenceScore: Number(payload.confidenceScore ?? 50),
                    sourceType: String(payload.sourceType ?? "gps"),
                    sessionStatus: payload.sessionStatus == null ? undefined : String(payload.sessionStatus),
                    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : undefined
                });
                sendJson(res, 201, { session });
                return;
            }
            const helpfulMatch = /^\/reviews\/([^/]+)\/helpful$/.exec(normalizedPath);
            if (helpfulMatch && deps?.reviewsStore) {
                const reviewId = decodeURIComponent(helpfulMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                if (req.method === "POST") {
                    const review = await deps.reviewsStore.voteHelpful(reviewId, userIdHeader);
                    await track({ eventName: "review_helpful_clicked", reviewId, placeId: review.placeId }, { actorUserId: userIdHeader, sourceRoute: "/reviews/:reviewId/helpful" });
                    if (deps.notificationService && review.authorUserId !== userIdHeader && deps.accountsService) {
                        const actor = deps.accountsService.getIdentitySummary(userIdHeader);
                        await deps.notificationService.notify({
                            eventId: `review.helpful:${reviewId}:${userIdHeader}`,
                            type: "review.liked",
                            recipientUserId: review.authorUserId,
                            actor: { userId: userIdHeader, displayName: actor.personalProfile.displayName, profileType: "user" },
                            reviewId,
                            placeId: review.placeId
                        });
                    }
                    sendJson(res, 200, { review });
                    return;
                }
                if (req.method === "DELETE") {
                    const review = await deps.reviewsStore.unvoteHelpful(reviewId, userIdHeader);
                    sendJson(res, 200, { review });
                    return;
                }
            }
            const reportMatch = /^\/reviews\/([^/]+)\/report$/.exec(normalizedPath);
            if (reportMatch && req.method === "POST" && deps?.reviewsStore) {
                const reviewId = decodeURIComponent(reportMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const reason = String(payload.reason ?? "").trim() || "unspecified";
                await deps.reviewsStore.reportReview(reviewId, userIdHeader, reason);
                await track({ eventName: "review_report_submitted", reviewId, metadata: { reason } }, { actorUserId: userIdHeader, sourceRoute: "/reviews/:reviewId/report" });
                if (deps.moderationService) {
                    await deps.moderationService.submitReport({
                        target: { targetType: "review", targetId: reviewId, reviewId },
                        reporterUserId: userIdHeader,
                        reasonCode: normalizeReportReason(payload.reason),
                        note: payload.note == null ? undefined : String(payload.note)
                    });
                }
                sendJson(res, 202, { ok: true });
                return;
            }
            const mediaReportMatch = /^\/reviews\/media\/([^/]+)\/report$/.exec(normalizedPath);
            if (mediaReportMatch && req.method === "POST" && deps?.reviewsStore) {
                const mediaId = decodeURIComponent(mediaReportMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const reason = String(payload.reason ?? "").trim() || "unspecified";
                await deps.reviewsStore.reportReviewMedia(mediaId, userIdHeader, reason);
                if (deps.moderationService) {
                    await deps.moderationService.submitReport({
                        target: { targetType: "review_media", targetId: mediaId, mediaId, reviewId: payload.reviewId == null ? undefined : String(payload.reviewId) },
                        reporterUserId: userIdHeader,
                        reasonCode: normalizeReportReason(payload.reason),
                        note: payload.note == null ? undefined : String(payload.note)
                    });
                }
                sendJson(res, 202, { ok: true });
                return;
            }
            if (normalizedPath === "/v1/moderation/reports" && req.method === "POST" && deps?.moderationService) {
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader)
                    throw new ValidationError(["x-user-id header is required"]);
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const targetType = String(payload.targetType ?? "").trim();
                const targetId = String(payload.targetId ?? "").trim();
                if (!targetType || !targetId)
                    throw new ValidationError(["targetType and targetId are required"]);
                const result = await deps.moderationService.submitReport({
                    target: {
                        targetType: targetType,
                        targetId,
                        reviewId: payload.reviewId == null ? undefined : String(payload.reviewId),
                        mediaId: payload.mediaId == null ? undefined : String(payload.mediaId),
                        placeId: payload.placeId == null ? undefined : String(payload.placeId),
                        subjectUserId: payload.subjectUserId == null ? undefined : String(payload.subjectUserId)
                    },
                    reporterUserId: userIdHeader,
                    reasonCode: normalizeReportReason(payload.reasonCode ?? payload.reason),
                    note: payload.note == null ? undefined : String(payload.note)
                });
                sendJson(res, 202, result);
                return;
            }
            if (normalizedPath === "/v1/admin/moderation/queue" && req.method === "GET" && deps?.moderationService) {
                if (!assertAdmin(req)) {
                    sendJson(res, 401, { error: "unauthorized" });
                    return;
                }
                const queue = deps.moderationService.listQueue({
                    targetType: (url.searchParams.get("targetType") ?? undefined),
                    state: (url.searchParams.get("state") ?? undefined),
                    severity: (url.searchParams.get("severity") ?? undefined),
                    unresolvedOnly: String(url.searchParams.get("unresolvedOnly") ?? "true") === "true",
                    limit: Number(url.searchParams.get("limit") ?? "50")
                });
                sendJson(res, 200, { queue });
                return;
            }
            if (normalizedPath === "/v1/admin/trust/actors" && req.method === "GET" && deps?.moderationService) {
                if (!assertAdmin(req)) {
                    sendJson(res, 401, { error: "unauthorized" });
                    return;
                }
                sendJson(res, 200, { items: deps.moderationService.listActorSummaries(Number(url.searchParams.get("limit") ?? "100")) });
                return;
            }
            if (normalizedPath === "/v1/admin/trust/places" && req.method === "GET" && deps?.moderationService) {
                if (!assertAdmin(req)) {
                    sendJson(res, 401, { error: "unauthorized" });
                    return;
                }
                sendJson(res, 200, { items: deps.moderationService.listPlaceSummaries(Number(url.searchParams.get("limit") ?? "100")) });
                return;
            }
            if (normalizedPath === "/v1/trust/content" && req.method === "GET" && deps?.trustSafetyService) {
                const targetType = String(url.searchParams.get("targetType") ?? "").trim();
                const targetId = String(url.searchParams.get("targetId") ?? "").trim();
                if (!targetType || !targetId)
                    throw new ValidationError(["targetType and targetId are required"]);
                const summary = deps.trustSafetyService.getContentSummary({
                    targetType: targetType,
                    targetId,
                    placeId: url.searchParams.get("placeId") ?? undefined,
                    subjectUserId: url.searchParams.get("subjectUserId") ?? undefined
                });
                sendJson(res, 200, { summary });
                return;
            }
            if (normalizedPath === "/v1/admin/moderation/decision" && req.method === "POST" && deps?.moderationService) {
                if (!assertAdmin(req)) {
                    sendJson(res, 401, { error: "unauthorized" });
                    return;
                }
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const targetType = String(payload.targetType ?? "").trim();
                const targetId = String(payload.targetId ?? "").trim();
                const decisionType = String(payload.decisionType ?? "").trim();
                if (!targetType || !targetId || !decisionType)
                    throw new ValidationError(["targetType, targetId, and decisionType are required"]);
                const decision = await deps.moderationService.adminDecision({
                    target: {
                        targetType: targetType,
                        targetId,
                        reviewId: payload.reviewId == null ? undefined : String(payload.reviewId),
                        mediaId: payload.mediaId == null ? undefined : String(payload.mediaId),
                        placeId: payload.placeId == null ? undefined : String(payload.placeId),
                        subjectUserId: payload.subjectUserId == null ? undefined : String(payload.subjectUserId)
                    },
                    decisionType: decisionType,
                    reasonCode: String(payload.reasonCode ?? "admin_decision"),
                    notes: payload.notes == null ? undefined : String(payload.notes),
                    actorUserId: String(readHeader(req, "x-user-id") ?? "admin")
                });
                await track({ eventName: decisionType === "approve" ? "review_approved" : "review_rejected", reviewId: payload.reviewId == null ? undefined : String(payload.reviewId), success: decisionType === "approve", metadata: { targetType, targetId, decisionType } }, { actorUserId: String(readHeader(req, "x-user-id") ?? "admin"), actorProfileType: "admin", sourceRoute: "/v1/admin/moderation/decision" });
                if (deps.notificationService && decisionType === "approve" && payload.subjectUserId) {
                    await deps.notificationService.notify({
                        eventId: `moderation.approve:${targetType}:${targetId}`,
                        type: "review.approved",
                        recipientUserId: String(payload.subjectUserId),
                        reviewId: targetId,
                        placeId: String(payload.placeId ?? ""),
                        placeName: payload.placeName == null ? undefined : String(payload.placeName)
                    });
                }
                sendJson(res, 200, { decision });
                return;
            }
            const moderationTargetMatch = /^\/v1\/admin\/moderation\/targets\/([^/]+)\/([^/]+)$/.exec(normalizedPath);
            if (moderationTargetMatch && req.method === "GET" && deps?.moderationService) {
                if (!assertAdmin(req)) {
                    sendJson(res, 401, { error: "unauthorized" });
                    return;
                }
                const targetType = decodeURIComponent(moderationTargetMatch[1] ?? "");
                const targetId = decodeURIComponent(moderationTargetMatch[2] ?? "");
                const details = deps.moderationService.getTargetDetails({ targetType: targetType, targetId });
                sendJson(res, 200, details);
                return;
            }
            const businessResponseMatch = /^\/v1\/reviews\/([^/]+)\/business-response$/.exec(normalizedPath);
            if (businessResponseMatch && req.method === "POST" && deps?.reviewsStore) {
                const reviewId = decodeURIComponent(businessResponseMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader || !deps.accountsService)
                    throw new ValidationError(["x-user-id header is required"]);
                const actor = deps.accountsService.resolveActingContext(userIdHeader, {
                    profileType: ProfileType.BUSINESS,
                    profileId: String(readHeader(req, "x-acting-profile-id") ?? "").trim()
                });
                const decision = deps.accountsService.authorizeAction(actor, PermissionAction.BUSINESS_REPLY);
                if (!decision.allowed) {
                    sendJson(res, 403, { decision });
                    return;
                }
                const review = await deps.reviewsStore.getById(reviewId, actor.userId, true);
                if (!review)
                    throw new ValidationError(["review not found"]);
                const ownership = await service.getActiveOwnershipForBusinessActor({ placeId: review.placeId, businessProfileId: actor.profileId, userId: actor.userId });
                if (deps.accessEngine) {
                    const target = { targetId: actor.profileId, targetType: SubscriptionTargetType.BUSINESS };
                    const feature = await deps.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.REVIEWS_REPLY_AS_BUSINESS);
                    if (!feature.allowed) {
                        sendJson(res, 403, { access: { ...feature, denialReason: "business_plan_required" } });
                        return;
                    }
                }
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const clean = sanitizeText(payload.content ?? payload.body, {
                    source: "user",
                    maxLen: 1200,
                    allowNewlines: true,
                    profanityMode: "mask",
                    stripHtml: true
                });
                if (!clean || clean.length < 2)
                    throw new ValidationError(["content length must be between 2 and 1200"]);
                const moderationRequired = actor.businessMembershipRole === "EDITOR";
                const response = await deps.reviewsStore.createOrUpdateBusinessReviewResponse({
                    reviewId,
                    placeId: review.placeId,
                    businessProfileId: actor.profileId,
                    ownershipLinkId: ownership.id,
                    authoredByUserId: actor.userId,
                    content: clean,
                    moderationRequired
                });
                if (deps.moderationService) {
                    await deps.moderationService.analyzeContent({
                        target: { targetType: "business_review_response", targetId: response.id, reviewId, placeId: review.placeId, subjectUserId: actor.userId },
                        text: clean,
                        actorUserId: actor.userId
                    });
                }
                if (deps.notificationService && review.authorUserId !== actor.userId && deps.accountsService) {
                    const business = deps.accountsService.getBusinessProfileById(actor.profileId);
                    await deps.notificationService.notify({
                        eventId: `business.reply:${response.id}`,
                        type: "review.business_reply.created",
                        recipientUserId: review.authorUserId,
                        actor: { userId: actor.userId, businessId: actor.profileId, displayName: business?.businessName ?? "Business", profileType: "business" },
                        reviewId,
                        placeId: review.placeId,
                        snippet: response.content
                    });
                }
                await track({ eventName: "business_reply_created", reviewId, placeId: review.placeId, businessId: actor.profileId }, { actorUserId: actor.userId, actorProfileType: "business", actorProfileId: actor.profileId, sourceRoute: "/v1/reviews/:reviewId/business-response" });
                sendJson(res, 201, { response });
                return;
            }
            const businessResponseDetailMatch = /^\/v1\/reviews\/([^/]+)\/business-response\/([^/]+)$/.exec(normalizedPath);
            if (businessResponseDetailMatch && deps?.reviewsStore) {
                const reviewId = decodeURIComponent(businessResponseDetailMatch[1] ?? "");
                const responseId = decodeURIComponent(businessResponseDetailMatch[2] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader || !deps.accountsService)
                    throw new ValidationError(["x-user-id header is required"]);
                if (req.method === "PATCH") {
                    const actor = deps.accountsService.resolveActingContext(userIdHeader, {
                        profileType: ProfileType.BUSINESS,
                        profileId: String(readHeader(req, "x-acting-profile-id") ?? "").trim()
                    });
                    const decision = deps.accountsService.authorizeAction(actor, PermissionAction.BUSINESS_REPLY);
                    if (!decision.allowed) {
                        sendJson(res, 403, { decision });
                        return;
                    }
                    const review = await deps.reviewsStore.getById(reviewId, actor.userId, true);
                    if (!review)
                        throw new ValidationError(["review not found"]);
                    const ownership = await service.getActiveOwnershipForBusinessActor({ placeId: review.placeId, businessProfileId: actor.profileId, userId: actor.userId });
                    const body = await parseJsonBody(req);
                    const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                    const clean = sanitizeText(payload.content ?? payload.body, { source: "user", maxLen: 1200, allowNewlines: true, profanityMode: "mask", stripHtml: true });
                    if (!clean || clean.length < 2)
                        throw new ValidationError(["content length must be between 2 and 1200"]);
                    const moderationRequired = true;
                    const response = await deps.reviewsStore.createOrUpdateBusinessReviewResponse({
                        reviewId,
                        placeId: review.placeId,
                        businessProfileId: actor.profileId,
                        ownershipLinkId: ownership.id,
                        authoredByUserId: actor.userId,
                        content: clean,
                        moderationRequired
                    });
                    if (deps.moderationService) {
                        await deps.moderationService.analyzeContent({
                            target: { targetType: "business_review_response", targetId: response.id, reviewId, placeId: review.placeId, subjectUserId: actor.userId },
                            text: clean,
                            actorUserId: actor.userId
                        });
                    }
                    if (response.id !== responseId)
                        throw new ValidationError(["business response id mismatch"]);
                    sendJson(res, 200, { response });
                    return;
                }
                if (req.method === "DELETE") {
                    const actor = deps.accountsService.resolveActingContext(userIdHeader, {
                        profileType: ProfileType.BUSINESS,
                        profileId: String(readHeader(req, "x-acting-profile-id") ?? "").trim()
                    });
                    const response = await deps.reviewsStore.removeOwnBusinessReviewResponse({ responseId, actorUserId: actor.userId, businessProfileId: actor.profileId });
                    sendJson(res, 200, { response });
                    return;
                }
            }
            const businessModerationQueueMatch = /^\/v1\/admin\/business-review-responses$/.exec(normalizedPath);
            if (businessModerationQueueMatch && req.method === "GET" && deps?.reviewsStore) {
                if (!assertAdmin(req)) {
                    sendJson(res, 403, { error: "admin privileges required" });
                    return;
                }
                const statusesRaw = String(url.searchParams.get("statuses") ?? "").trim();
                const statuses = statusesRaw ? statusesRaw.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
                const responses = await deps.reviewsStore.listBusinessReviewResponsesForModeration({
                    statuses,
                    placeId: String(url.searchParams.get("placeId") ?? "").trim() || undefined,
                    businessProfileId: String(url.searchParams.get("businessProfileId") ?? "").trim() || undefined,
                    limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined
                });
                sendJson(res, 200, { responses });
                return;
            }
            const businessModerationActionMatch = /^\/v1\/admin\/business-review-responses\/([^/]+)\/moderation$/.exec(normalizedPath);
            if (businessModerationActionMatch && req.method === "POST" && deps?.reviewsStore) {
                if (!assertAdmin(req)) {
                    sendJson(res, 403, { error: "admin privileges required" });
                    return;
                }
                const responseId = decodeURIComponent(businessModerationActionMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim() || "admin";
                const body = await parseJsonBody(req);
                const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {});
                const action = String(payload.action ?? "").trim();
                const response = await deps.reviewsStore.moderateBusinessReviewResponse({
                    responseId,
                    action: action,
                    actedByUserId: userIdHeader,
                    reasonCode: payload.reasonCode == null ? undefined : String(payload.reasonCode),
                    notes: payload.notes == null ? undefined : String(payload.notes)
                });
                sendJson(res, 200, { response });
                return;
            }
            const businessResponseHistoryMatch = /^\/v1\/admin\/business-review-responses\/([^/]+)\/history$/.exec(normalizedPath);
            if (businessResponseHistoryMatch && req.method === "GET" && deps?.reviewsStore) {
                if (!assertAdmin(req)) {
                    sendJson(res, 403, { error: "admin privileges required" });
                    return;
                }
                const responseId = decodeURIComponent(businessResponseHistoryMatch[1] ?? "");
                const revisions = await deps.reviewsStore.listBusinessReviewResponseRevisions(responseId);
                const moderationActions = await deps.reviewsStore.listBusinessReviewResponseModerationActions(responseId);
                sendJson(res, 200, { revisions, moderationActions });
                return;
            }
            const businessDashboardReviewsMatch = /^\/v1\/business\/places\/([^/]+)\/review-response-dashboard$/.exec(normalizedPath);
            if (businessDashboardReviewsMatch && req.method === "GET" && deps?.reviewsStore) {
                const placeId = decodeURIComponent(businessDashboardReviewsMatch[1] ?? "");
                const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userIdHeader || !deps.accountsService)
                    throw new ValidationError(["x-user-id header is required"]);
                const actor = deps.accountsService.resolveActingContext(userIdHeader, {
                    profileType: ProfileType.BUSINESS,
                    profileId: String(readHeader(req, "x-acting-profile-id") ?? "").trim()
                });
                await service.getActiveOwnershipForBusinessActor({ placeId, businessProfileId: actor.profileId, userId: actor.userId });
                const reviews = await deps.reviewsStore.listReviewsForBusinessResponseDashboard({
                    placeIds: [placeId],
                    onlyUnanswered: String(url.searchParams.get("onlyUnanswered") ?? "false") === "true",
                    limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined
                });
                sendJson(res, 200, { reviews });
                return;
            }
            if (deps?.accessEngine && req.method === "POST" && normalizedPath === "/v1/ai/place-summary") {
                const userId = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userId)
                    throw new ValidationError(["x-user-id header is required"]);
                const accountType = deps?.accountsService
                    ? deps.accountsService.resolveSubscriptionTarget({ userId, profileType: ProfileType.PERSONAL, profileId: userId, roles: [] }).accountType
                    : "USER";
                const target = { targetType: accountType, targetId: userId };
                const feature = await deps.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.AI_PLACE_SUMMARY);
                if (!feature.allowed) {
                    sendJson(res, 403, { access: { ...feature, denialReason: "not_in_plan" } });
                    return;
                }
                const daily = await deps.accessEngine.checkAndConsumeQuota(target, QUOTA_KEYS.AI_REQUESTS_PER_DAY, 1);
                if (!daily.allowed) {
                    sendJson(res, 403, { access: daily });
                    return;
                }
                const monthly = await deps.accessEngine.checkAndConsumeQuota(target, QUOTA_KEYS.AI_REQUESTS_PER_MONTH, 1);
                if (!monthly.allowed) {
                    sendJson(res, 403, { access: monthly });
                    return;
                }
                sendJson(res, 200, {
                    summary: "AI place summary is currently mocked in backend route integration.",
                    usage: { daily, monthly }
                });
                return;
            }
            const premiumContentMatch = /^\/v1\/content\/([^/]+)$/.exec(normalizedPath);
            if (deps?.accessEngine && req.method === "GET" && premiumContentMatch) {
                const userId = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userId)
                    throw new ValidationError(["x-user-id header is required"]);
                const contentId = decodeURIComponent(premiumContentMatch[1] ?? "");
                const descriptor = PREMIUM_CONTENT[contentId];
                if (!descriptor) {
                    sendJson(res, 404, { error: "content_not_found" });
                    return;
                }
                const target = { targetType: SubscriptionTargetType.USER, targetId: userId };
                const decision = await deps.accessEngine.checkPremiumContentAccess(target, descriptor);
                if (!decision.allowed) {
                    sendJson(res, 403, { access: decision });
                    return;
                }
                await deps.accessEngine.consumeQuota(target, QUOTA_KEYS.CONTENT_PREMIUM_VIEWS_PER_MONTH, 1);
                sendJson(res, 200, {
                    content: { id: descriptor.contentId, visibility: descriptor.visibility, body: "Premium content payload placeholder" },
                    access: decision
                });
                return;
            }
            if (deps?.accessEngine && req.method === "GET" && normalizedPath === "/v1/access/summary") {
                const userId = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userId)
                    throw new ValidationError(["x-user-id header is required"]);
                const target = { targetType: SubscriptionTargetType.USER, targetId: userId };
                const features = await deps.accessEngine.getFeatureAccessSummary(target);
                const quotas = await deps.accessEngine.getQuotaSummary(target);
                sendJson(res, 200, { features, quotas });
                return;
            }
            if (deps?.accessEngine && deps?.subscriptionService && req.method === "GET" && normalizedPath === "/v1/entitlements/summary") {
                const userId = String(readHeader(req, "x-user-id") ?? "").trim();
                if (!userId)
                    throw new ValidationError(["x-user-id header is required"]);
                const requestedType = String(url.searchParams.get("targetType") ?? "USER").toUpperCase();
                const targetType = requestedType === SubscriptionTargetType.CREATOR || requestedType === SubscriptionTargetType.BUSINESS
                    ? requestedType
                    : SubscriptionTargetType.USER;
                const target = { targetType, targetId: userId };
                const featureSummary = await deps.accessEngine.getFeatureAccessSummary(target);
                const quotaSummary = await deps.accessEngine.getQuotaSummary(target);
                const subscription = deps.subscriptionService.getSubscription(userId);
                const plan = getPlan(subscription.planId);
                const currentPlanId = plan?.id ?? subscription.planId;
                const upgradePlanId = plan?.upgradePlanIds[0];
                sendJson(res, 200, {
                    context: {
                        userId,
                        targetType,
                        evaluatedAt: new Date().toISOString(),
                        plan: {
                            id: currentPlanId,
                            code: plan?.code ?? "unknown",
                            tier: plan?.tier ?? "FREE",
                            status: subscription.status
                        }
                    },
                    ads: {
                        adsEnabled: !featureSummary.features.find((item) => item.key === FEATURE_KEYS.ADS_AD_FREE)?.enabled,
                        adsLevel: featureSummary.features.find((item) => item.key === FEATURE_KEYS.ADS_AD_FREE)?.enabled ? "suppressed" : "full"
                    },
                    features: featureSummary.features.map((item) => ({
                        key: item.key,
                        allowed: item.enabled,
                        source: item.source,
                        reasonCode: item.enabled ? "ALLOWED" : "FEATURE_NOT_IN_PLAN",
                        upgradeable: !item.enabled && Boolean(upgradePlanId),
                        suggestedPlanId: !item.enabled ? upgradePlanId : undefined
                    })),
                    quotas: quotaSummary.quotas.map((item) => ({
                        key: item.key,
                        limit: item.limit,
                        used: item.used,
                        remaining: item.remaining,
                        unlimited: item.limit < 0,
                        resetAt: item.resetAt,
                        source: item.source
                    }))
                });
                return;
            }
            if (creatorPremiumHandlers) {
                const creatorPremiumStateMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/premium-state$/);
                if (req.method === "GET" && creatorPremiumStateMatch) {
                    await creatorPremiumHandlers.premiumState(req, res, decodeURIComponent(creatorPremiumStateMatch[1] ?? ""));
                    return;
                }
                const creatorAnalyticsOverviewMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/premium-analytics\/overview$/);
                if (req.method === "GET" && creatorAnalyticsOverviewMatch) {
                    await creatorPremiumHandlers.analyticsOverview(req, res, decodeURIComponent(creatorAnalyticsOverviewMatch[1] ?? ""));
                    return;
                }
                const creatorAnalyticsAudienceMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/premium-analytics\/audience$/);
                if (req.method === "GET" && creatorAnalyticsAudienceMatch) {
                    await creatorPremiumHandlers.analyticsAudience(req, res, decodeURIComponent(creatorAnalyticsAudienceMatch[1] ?? ""));
                    return;
                }
                const creatorAnalyticsTrackMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/premium-analytics\/events$/);
                if (req.method === "POST" && creatorAnalyticsTrackMatch) {
                    await creatorPremiumHandlers.trackAnalytics(req, res, decodeURIComponent(creatorAnalyticsTrackMatch[1] ?? ""));
                    return;
                }
                const creatorQuotaMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/quotas\/([^/]+)$/);
                if (req.method === "GET" && creatorQuotaMatch) {
                    await creatorPremiumHandlers.quotaState(req, res, decodeURIComponent(creatorQuotaMatch[1] ?? ""), decodeURIComponent(creatorQuotaMatch[2] ?? ""));
                    return;
                }
                if (req.method === "POST" && creatorQuotaMatch) {
                    await creatorPremiumHandlers.consumeQuota(req, res, decodeURIComponent(creatorQuotaMatch[1] ?? ""), decodeURIComponent(creatorQuotaMatch[2] ?? ""));
                    return;
                }
                const creatorDiscoverabilityMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/discoverability$/);
                if (req.method === "GET" && creatorDiscoverabilityMatch) {
                    await creatorPremiumHandlers.discoverability(req, res, decodeURIComponent(creatorDiscoverabilityMatch[1] ?? ""));
                    return;
                }
                const creatorBrandingMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/branding$/);
                if (req.method === "PATCH" && creatorBrandingMatch) {
                    await creatorPremiumHandlers.updateBranding(req, res, decodeURIComponent(creatorBrandingMatch[1] ?? ""));
                    return;
                }
                const creatorMonetizationControlsMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/premium-monetization$/);
                if (req.method === "PATCH" && creatorMonetizationControlsMatch) {
                    await creatorPremiumHandlers.updateMonetization(req, res, decodeURIComponent(creatorMonetizationControlsMatch[1] ?? ""));
                    return;
                }
                const creatorUpgradeMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/upgrade-context$/);
                if (req.method === "GET" && creatorUpgradeMatch) {
                    await creatorPremiumHandlers.upgradeContext(req, res, decodeURIComponent(creatorUpgradeMatch[1] ?? ""));
                    return;
                }
            }
            if (creatorMonetizationHandlers) {
                const monetizationProfileMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/monetization$/);
                if (req.method === "GET" && monetizationProfileMatch) {
                    await creatorMonetizationHandlers.getProfile(req, res, decodeURIComponent(monetizationProfileMatch[1] ?? ""));
                    return;
                }
                if (req.method === "PATCH" && monetizationProfileMatch) {
                    await creatorMonetizationHandlers.updateSettings(req, res, decodeURIComponent(monetizationProfileMatch[1] ?? ""));
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/creator/tips/intents") {
                    await creatorMonetizationHandlers.createTipIntent(req, res);
                    return;
                }
                const premiumGuideMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/guides\/([^/]+)\/monetization$/);
                if (req.method === "PATCH" && premiumGuideMatch) {
                    await creatorMonetizationHandlers.setGuidePremium(req, res, decodeURIComponent(premiumGuideMatch[1] ?? ""), decodeURIComponent(premiumGuideMatch[2] ?? ""));
                    return;
                }
                const membershipPlanMatch = normalizedPath.match(/^\/v1\/creator\/profiles\/([^/]+)\/membership-plans$/);
                if (req.method === "POST" && membershipPlanMatch) {
                    await creatorMonetizationHandlers.createMembershipPlan(req, res, decodeURIComponent(membershipPlanMatch[1] ?? ""));
                    return;
                }
                const adminMonetizationMatch = normalizedPath.match(/^\/v1\/admin\/creator\/profiles\/([^/]+)\/monetization$/);
                if (req.method === "PATCH" && adminMonetizationMatch) {
                    if (!assertAdmin(req))
                        return sendJson(res, 403, { error: "forbidden" });
                    await creatorMonetizationHandlers.adminStatus(req, res, decodeURIComponent(adminMonetizationMatch[1] ?? ""));
                    return;
                }
            }
            if (creatorVerificationHandlers) {
                if (req.method === "GET" && normalizedPath === "/v1/creator/verification/status") {
                    await creatorVerificationHandlers.status(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/creator/verification/eligibility") {
                    await creatorVerificationHandlers.eligibility(req, res);
                    return;
                }
                if (req.method === "PUT" && normalizedPath === "/v1/creator/verification/draft") {
                    await creatorVerificationHandlers.saveDraft(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/creator/verification/submit") {
                    await creatorVerificationHandlers.submit(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/admin/creator/verification/applications") {
                    if (!assertAdmin(req))
                        return sendJson(res, 403, { error: "forbidden" });
                    await creatorVerificationHandlers.adminList(req, res);
                    return;
                }
                const verificationDetailMatch = /^\/v1\/admin\/creator\/verification\/applications\/([^/]+)$/.exec(normalizedPath);
                if (verificationDetailMatch && req.method === "GET") {
                    if (!assertAdmin(req))
                        return sendJson(res, 403, { error: "forbidden" });
                    await creatorVerificationHandlers.adminDetail(req, res, decodeURIComponent(verificationDetailMatch[1] ?? ""));
                    return;
                }
                const verificationActionMatch = /^\/v1\/admin\/creator\/verification\/applications\/([^/]+)\/(under-review|needs-more-info|approve|reject)$/.exec(normalizedPath);
                if (verificationActionMatch && req.method === "POST") {
                    if (!assertAdmin(req))
                        return sendJson(res, 403, { error: "forbidden" });
                    const applicationId = decodeURIComponent(verificationActionMatch[1] ?? "");
                    const action = verificationActionMatch[2];
                    if (action === "under-review")
                        await creatorVerificationHandlers.adminUnderReview(req, res, applicationId);
                    if (action === "needs-more-info")
                        await creatorVerificationHandlers.adminNeedsMoreInfo(req, res, applicationId);
                    if (action === "approve")
                        await creatorVerificationHandlers.adminApprove(req, res, applicationId);
                    if (action === "reject")
                        await creatorVerificationHandlers.adminReject(req, res, applicationId);
                    return;
                }
                const verificationRevokeMatch = /^\/v1\/admin\/creator\/verification\/profiles\/([^/]+)\/revoke$/.exec(normalizedPath);
                if (verificationRevokeMatch && req.method === "POST") {
                    if (!assertAdmin(req))
                        return sendJson(res, 403, { error: "forbidden" });
                    await creatorVerificationHandlers.adminRevoke(req, res, decodeURIComponent(verificationRevokeMatch[1] ?? ""));
                    return;
                }
            }
            if (creatorHandlers) {
                if (req.method === "POST" && normalizedPath === "/v1/creator/profiles") {
                    await creatorHandlers.upsertProfile(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/creator/follows") {
                    await creatorHandlers.listFollows(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/creator/handles/availability") {
                    await creatorHandlers.checkHandleAvailability(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/creator/feed") {
                    await creatorHandlers.followingFeed(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/guides/search") {
                    await creatorHandlers.searchGuides(req, res);
                    return;
                }
                const placeCreatorContentMatch = /^\/places\/([^/]+)\/creator-content$/.exec(normalizedPath);
                if (placeCreatorContentMatch && req.method === "GET") {
                    await creatorHandlers.placeCreatorContent(req, res, decodeURIComponent(placeCreatorContentMatch[1] ?? ""));
                    return;
                }
                const creatorProfileMatch = /^\/v1\/creator\/profiles\/([^/]+)$/.exec(normalizedPath);
                if (creatorProfileMatch && req.method === "PATCH") {
                    await creatorHandlers.updateProfile(req, res, decodeURIComponent(creatorProfileMatch[1] ?? ""));
                    return;
                }
                const publicCreatorMatch = /^\/v1\/creators\/([^/]+)$/.exec(normalizedPath);
                if (publicCreatorMatch && req.method === "GET") {
                    await creatorHandlers.getPublicProfile(req, res, decodeURIComponent(publicCreatorMatch[1] ?? ""));
                    return;
                }
                const followMatch = /^\/v1\/creator\/profiles\/([^/]+)\/follow$/.exec(normalizedPath);
                if (followMatch && req.method === "POST") {
                    await creatorHandlers.follow(req, res, decodeURIComponent(followMatch[1] ?? ""));
                    return;
                }
                if (followMatch && req.method === "DELETE") {
                    await creatorHandlers.unfollow(req, res, decodeURIComponent(followMatch[1] ?? ""));
                    return;
                }
                const guidesMatch = /^\/v1\/creator\/profiles\/([^/]+)\/guides$/.exec(normalizedPath);
                if (guidesMatch && req.method === "POST") {
                    await creatorHandlers.createGuide(req, res, decodeURIComponent(guidesMatch[1] ?? ""));
                    return;
                }
                const guidePatchMatch = /^\/v1\/creator\/guides\/([^/]+)$/.exec(normalizedPath);
                if (guidePatchMatch && req.method === "PATCH") {
                    await creatorHandlers.updateGuide(req, res, decodeURIComponent(guidePatchMatch[1] ?? ""));
                    return;
                }
                const publicGuideMatch = /^\/v1\/creators\/([^/]+)\/guides\/([^/]+)$/.exec(normalizedPath);
                if (publicGuideMatch && req.method === "GET") {
                    await creatorHandlers.getGuide(req, res, decodeURIComponent(publicGuideMatch[1] ?? ""), decodeURIComponent(publicGuideMatch[2] ?? ""));
                    return;
                }
                const analyticsMatch = /^\/v1\/creator\/profiles\/([^/]+)\/analytics$/.exec(normalizedPath);
                if (analyticsMatch && req.method === "GET") {
                    await creatorHandlers.analytics(req, res, decodeURIComponent(analyticsMatch[1] ?? ""));
                    return;
                }
            }
            if (accountHandlers) {
                if (req.method === "GET" && normalizedPath === "/v1/identity") {
                    await accountHandlers.getCurrentIdentity(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/identity/contexts") {
                    await accountHandlers.getActingContexts(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/identity/context/switch") {
                    await accountHandlers.switchContext(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/profiles/creator") {
                    await accountHandlers.createCreatorProfile(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/profiles/business") {
                    await accountHandlers.createBusinessProfile(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/identity/permissions") {
                    await accountHandlers.getPermissions(req, res);
                    return;
                }
                const businessMembersMatch = /^\/v1\/business-profiles\/([^/]+)\/members$/.exec(normalizedPath);
                if (businessMembersMatch) {
                    const businessProfileId = decodeURIComponent(businessMembersMatch[1] ?? "");
                    if (req.method === "GET") {
                        await accountHandlers.listBusinessMembers(req, res, businessProfileId);
                        return;
                    }
                    if (req.method === "POST") {
                        await accountHandlers.inviteBusinessMember(req, res, businessProfileId);
                        return;
                    }
                }
            }
            if (subscriptionHandlers) {
                if (req.method === "GET" && normalizedPath === "/v1/subscription") {
                    await subscriptionHandlers.getCurrentSubscription(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/entitlements") {
                    await subscriptionHandlers.getCurrentEntitlements(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/billing-state") {
                    await subscriptionHandlers.getBillingState(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/plans") {
                    await subscriptionHandlers.getAvailablePlans(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/trial-eligibility") {
                    await subscriptionHandlers.checkTrialEligibility(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/preview-upgrade") {
                    await subscriptionHandlers.previewUpgrade(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/preview-downgrade") {
                    await subscriptionHandlers.previewDowngrade(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/subscription/change") {
                    await subscriptionHandlers.startSubscriptionChange(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/subscription/start-trial") {
                    await subscriptionHandlers.startTrial(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/subscription/mark-past-due") {
                    await subscriptionHandlers.markPastDue(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/subscription/enter-grace") {
                    await subscriptionHandlers.enterGracePeriod(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/subscription/cancel") {
                    await subscriptionHandlers.cancelSubscription(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/subscription/resume") {
                    await subscriptionHandlers.resumeSubscription(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/usage") {
                    await subscriptionHandlers.getUsageSummary(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/subscription/authorize") {
                    await subscriptionHandlers.authorizeAction(req, res);
                    return;
                }
            }
            if (onboardingHandlers && req.method === "GET" && normalizedPath === "/v1/onboarding/preferences") {
                await onboardingHandlers.getPreferences(req, res);
                return;
            }
            if (onboardingHandlers && req.method === "PUT" && normalizedPath === "/v1/onboarding/preferences") {
                await onboardingHandlers.upsertPreferences(req, res);
                return;
            }
            if (onboardingHandlers && req.method === "GET" && normalizedPath === "/v1/feed/bootstrap") {
                await onboardingHandlers.bootstrapFeed(req, res);
                return;
            }
            const videoUploadMatch = /^\/v1\/videos\/([^/]+)\/upload-session$/.exec(normalizedPath);
            const videoFinalizeMatch = /^\/v1\/videos\/([^/]+)\/finalize-upload$/.exec(normalizedPath);
            const videoPublishMatch = /^\/v1\/videos\/([^/]+)\/publish$/.exec(normalizedPath);
            const videoRetryUploadMatch = /^\/v1\/videos\/([^/]+)\/retry-upload$/.exec(normalizedPath);
            const videoRetryProcessingMatch = /^\/v1\/videos\/([^/]+)\/retry-processing$/.exec(normalizedPath);
            const videoPatchMatch = /^\/v1\/videos\/([^/]+)$/.exec(normalizedPath);
            const videoArchiveMatch = /^\/v1\/videos\/([^/]+)\/archive$/.exec(normalizedPath);
            const videoEventMatch = /^\/v1\/videos\/([^/]+)\/events$/.exec(normalizedPath);
            const videoLikeMatch = /^\/v1\/videos\/([^/]+)\/likes$/.exec(normalizedPath);
            const videoSaveMatch = /^\/v1\/videos\/([^/]+)\/save$/.exec(normalizedPath);
            const videoReportMatch = /^\/v1\/videos\/([^/]+)\/report$/.exec(normalizedPath);
            const placeVideosMatch = /^\/v1\/places\/([^/]+)\/videos$/.exec(normalizedPath);
            const creatorVideosMatch = /^\/v1\/creators\/([^/]+)\/videos$/.exec(normalizedPath);
            if (videoPlatformHandlers && req.method === "POST" && normalizedPath === "/v1/videos") {
                await videoPlatformHandlers.createDraft(req, res);
                return;
            }
            if (videoPlatformHandlers && req.method === "GET" && normalizedPath === "/v1/feed/videos") {
                await videoPlatformHandlers.listFeed(req, res, url.searchParams);
                return;
            }
            if (videoPlatformHandlers && req.method === "GET" && normalizedPath === "/v1/studio/videos") {
                await videoPlatformHandlers.listStudio(req, res);
                return;
            }
            if (videoPlatformHandlers && req.method === "GET" && normalizedPath === "/v1/studio/analytics") {
                await videoPlatformHandlers.getStudioAnalytics(req, res);
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoUploadMatch) {
                await videoPlatformHandlers.requestUpload(req, res, decodeURIComponent(videoUploadMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoFinalizeMatch) {
                await videoPlatformHandlers.finalizeUpload(req, res, decodeURIComponent(videoFinalizeMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoPublishMatch) {
                await videoPlatformHandlers.publish(req, res, decodeURIComponent(videoPublishMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoRetryUploadMatch) {
                await videoPlatformHandlers.retryUpload(req, res, decodeURIComponent(videoRetryUploadMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoRetryProcessingMatch) {
                await videoPlatformHandlers.retryProcessing(req, res, decodeURIComponent(videoRetryProcessingMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && normalizedPath === "/v1/videos/jobs/process-next") {
                await videoPlatformHandlers.processNextJob(req, res);
                return;
            }
            if (videoPlatformHandlers && req.method === "PATCH" && videoPatchMatch) {
                await videoPlatformHandlers.updateDraft(req, res, decodeURIComponent(videoPatchMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoArchiveMatch) {
                await videoPlatformHandlers.archiveDraft(req, res, decodeURIComponent(videoArchiveMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoEventMatch) {
                await videoPlatformHandlers.trackEvent(req, res, decodeURIComponent(videoEventMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoLikeMatch) {
                await videoPlatformHandlers.likeVideo(req, res, decodeURIComponent(videoLikeMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "DELETE" && videoLikeMatch) {
                await videoPlatformHandlers.unlikeVideo(req, res, decodeURIComponent(videoLikeMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "POST" && videoSaveMatch) {
                await videoPlatformHandlers.saveVideo(req, res, decodeURIComponent(videoSaveMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "DELETE" && videoSaveMatch) {
                await videoPlatformHandlers.unsaveVideo(req, res, decodeURIComponent(videoSaveMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "GET" && normalizedPath === "/v1/videos/saved") {
                await videoPlatformHandlers.listSavedVideos(req, res, url.searchParams);
                return;
            }
            if (videoPlatformHandlers && req.method === "GET" && normalizedPath === "/v1/videos/watch-history") {
                await videoPlatformHandlers.listWatchHistory(req, res);
                return;
            }
            if (videoPlatformHandlers && req.method === "GET" && placeVideosMatch) {
                await videoPlatformHandlers.listPlaceVideos(req, res, decodeURIComponent(placeVideosMatch[1] ?? ""));
                return;
            }
            if (videoPlatformHandlers && req.method === "GET" && creatorVideosMatch) {
                await videoPlatformHandlers.listCreatorVideos(req, res, decodeURIComponent(creatorVideosMatch[1] ?? ""));
                return;
            }
            if (deps?.savedHandlers) {
                if (req.method === "POST" && normalizedPath === "/v1/saved/places") {
                    await deps.savedHandlers.savePlace(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/saved") {
                    await deps.savedHandlers.listSaved(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/saved/lists") {
                    await deps.savedHandlers.createList(req, res);
                    return;
                }
                const savedPlaceDeleteMatch = /^\/v1\/saved\/places\/([^/]+)$/.exec(normalizedPath);
                if (savedPlaceDeleteMatch && req.method === "DELETE") {
                    await deps.savedHandlers.unsavePlace(req, res, decodeURIComponent(savedPlaceDeleteMatch[1] ?? ""));
                    return;
                }
                const savedListMatch = /^\/v1\/saved\/lists\/([^/]+)$/.exec(normalizedPath);
                if (savedListMatch) {
                    const listId = decodeURIComponent(savedListMatch[1] ?? "");
                    if (req.method === "GET") {
                        await deps.savedHandlers.getList(req, res, listId);
                        return;
                    }
                    if (req.method === "PATCH") {
                        await deps.savedHandlers.updateList(req, res, listId);
                        return;
                    }
                }
                const listAddMatch = /^\/v1\/saved\/lists\/([^/]+)\/places$/.exec(normalizedPath);
                if (listAddMatch && req.method === "POST") {
                    await deps.savedHandlers.addPlaceToList(req, res, decodeURIComponent(listAddMatch[1] ?? ""));
                    return;
                }
                const listRemoveMatch = /^\/v1\/saved\/lists\/([^/]+)\/places\/([^/]+)$/.exec(normalizedPath);
                if (listRemoveMatch && req.method === "DELETE") {
                    await deps.savedHandlers.removePlaceFromList(req, res, decodeURIComponent(listRemoveMatch[1] ?? ""), decodeURIComponent(listRemoveMatch[2] ?? ""));
                    return;
                }
                const publicListsMatch = /^\/v1\/profiles\/([^/]+)\/lists$/.exec(normalizedPath);
                if (publicListsMatch && req.method === "GET") {
                    await deps.savedHandlers.listPublicByUser(req, res, decodeURIComponent(publicListsMatch[1] ?? ""));
                    return;
                }
            }
            if (deps?.placeContentHandlers) {
                if (req.method === "POST" && normalizedPath === "/v1/place-content/reviews") {
                    await deps.placeContentHandlers.createReview(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/place-content/videos") {
                    await deps.placeContentHandlers.createVideo(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/place-content/saves") {
                    await deps.placeContentHandlers.savePlace(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/place-content/guides") {
                    await deps.placeContentHandlers.createGuide(req, res);
                    return;
                }
                const saveDeleteMatch = /^\/v1\/place-content\/saves\/([^/]+)$/.exec(normalizedPath);
                if (saveDeleteMatch && req.method === "DELETE") {
                    await deps.placeContentHandlers.removeSave(req, res, decodeURIComponent(saveDeleteMatch[1] ?? ""));
                    return;
                }
                const guidePlaceAddMatch = /^\/v1\/place-content\/guides\/([^/]+)\/places$/.exec(normalizedPath);
                if (guidePlaceAddMatch && req.method === "POST") {
                    await deps.placeContentHandlers.addGuidePlace(req, res, decodeURIComponent(guidePlaceAddMatch[1] ?? ""));
                    return;
                }
                const placeContentMatch = /^\/v1\/place-content\/places\/([^/]+)$/.exec(normalizedPath);
                if (placeContentMatch && req.method === "GET") {
                    await deps.placeContentHandlers.placeContent(req, res, decodeURIComponent(placeContentMatch[1] ?? ""));
                    return;
                }
                const creatorContentMatch = /^\/v1\/place-content\/profiles\/([^/]+)$/.exec(normalizedPath);
                if (creatorContentMatch && req.method === "GET") {
                    await deps.placeContentHandlers.creatorContent(req, res, decodeURIComponent(creatorContentMatch[1] ?? ""));
                    return;
                }
            }
            if (req.method === "GET" && normalizedPath === "/live-results") {
                const lat = parseRequiredNumber(url.searchParams, "lat");
                const lng = parseRequiredNumber(url.searchParams, "lng");
                const radius = Number(url.searchParams.get("radius") ?? "2500");
                const category = url.searchParams.get("category") ?? "food";
                const sessionId = url.searchParams.get("sessionId") ?? "live-session";
                const searchPlan = buildCategorySearchPlan(category);
                const definition = getCategoryDefinition(category);
                const places = await searchNearby({
                    lat,
                    lng,
                    radiusMeters: radius,
                    maxResults: 20,
                    includedTypes: categoryToIncludedTypes(category)
                });
                const filtered = rankAndFilterCategoryResults(places, definition);
                const ranked = filtered.kept
                    .map((place) => ({
                    place,
                    score: (place.rating ?? 0) + Math.log10((place.userRatingCount ?? 0) + 1)
                }))
                    .sort((left, right) => right.score - left.score);
                const top = ranked[0];
                sendJson(res, 200, {
                    results: top
                        ? [
                            {
                                sessionId,
                                topPlanId: `google:${top.place.id}`,
                                topPlanTitle: top.place.displayName?.text ?? "Untitled place",
                                score: Number(top.score.toFixed(3))
                            }
                        ]
                        : [],
                    summary: {
                        activeSessions: top ? 1 : 0,
                        generatedAt: new Date().toISOString(),
                        categoryIntent: searchPlan.definition.semanticIntent,
                        filteredOutCount: filtered.rejected.length
                    }
                });
                return;
            }
            if (req.method === "GET" &&
                (normalizedPath === "/photo" || normalizedPath === "/photos" || normalizedPath === "/photos/media" || normalizedPath === "/places/photo")) {
                const name = url.searchParams.get("name");
                const maxWidthPx = Number(url.searchParams.get("maxWidthPx") ?? "800");
                const maxHeightPx = Number(url.searchParams.get("maxHeightPx") ?? "800");
                const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
                if (!name || !name.startsWith("places/") || !name.includes("/photos/")) {
                    sendJson(res, 400, { error: "invalid_photo_name" });
                    return;
                }
                if (!apiKey) {
                    sendJson(res, 503, { error: "photo_service_unavailable" });
                    return;
                }
                const clampedWidth = Math.max(1, Math.min(1600, maxWidthPx));
                const clampedHeight = Math.max(1, Math.min(1600, maxHeightPx));
                const mediaPath = name
                    .split("/")
                    .map((segment) => encodeURIComponent(segment))
                    .join("/");
                const photoMediaBaseUrl = process.env.GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL ?? DEFAULT_GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL;
                const mediaUrl = `${photoMediaBaseUrl}/${mediaPath}/media?maxWidthPx=${clampedWidth}&maxHeightPx=${clampedHeight}&key=${encodeURIComponent(apiKey)}`;
                try {
                    const response = await fetch(mediaUrl, { redirect: "follow" });
                    if (!response.ok || !response.body) {
                        sendJson(res, 404, { error: "photo_not_available" });
                        return;
                    }
                    res.statusCode = 200;
                    res.setHeader("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
                    res.setHeader("Cache-Control", "public, max-age=86400");
                    const arrayBuffer = await response.arrayBuffer();
                    res.end(Buffer.from(arrayBuffer));
                }
                catch {
                    sendJson(res, 404, { error: "photo_not_available" });
                }
                return;
            }
            const deckRouteMatch = /^\/sessions\/([^/]+)\/deck$/.exec(normalizedPath);
            if (req.method === "GET" && deckRouteMatch) {
                if (!deps?.deckHandler) {
                    sendJson(res, 503, { error: "deck_unavailable" });
                    return;
                }
                await deps.deckHandler(req, res, { sessionId: decodeURIComponent(deckRouteMatch[1] ?? "") });
                return;
            }
            const telemetryIngestMatch = /^\/sessions\/([^/]+)\/telemetry$/.exec(normalizedPath);
            if (telemetryIngestMatch && telemetryHandlers) {
                const sessionId = decodeURIComponent(telemetryIngestMatch[1] ?? "");
                if (req.method === "POST") {
                    await telemetryHandlers.ingest(req, res, sessionId);
                    return;
                }
                if (req.method === "GET") {
                    await telemetryHandlers.list(req, res, sessionId);
                    return;
                }
            }
            const telemetryAggregateMatch = /^\/sessions\/([^/]+)\/telemetry\/aggregate$/.exec(normalizedPath);
            if (telemetryAggregateMatch && telemetryHandlers && req.method === "GET") {
                await telemetryHandlers.aggregate(req, res, decodeURIComponent(telemetryAggregateMatch[1] ?? ""));
                return;
            }
            const listOrCreateIdeasMatch = /^\/sessions\/([^/]+)\/ideas$/.exec(normalizedPath);
            if (listOrCreateIdeasMatch && deps?.ideasHandlers) {
                const sessionId = decodeURIComponent(listOrCreateIdeasMatch[1] ?? "");
                if (req.method === "POST") {
                    await deps.ideasHandlers.postIdea(req, res, { sessionId });
                    return;
                }
                if (req.method === "GET") {
                    await deps.ideasHandlers.listIdeas(req, res, { sessionId });
                    return;
                }
            }
            const deleteIdeaMatch = /^\/sessions\/([^/]+)\/ideas\/([^/]+)$/.exec(normalizedPath);
            if (req.method === "DELETE" && deleteIdeaMatch && deps?.ideasHandlers) {
                await deps.ideasHandlers.deleteIdea(req, res, {
                    sessionId: decodeURIComponent(deleteIdeaMatch[1] ?? ""),
                    ideaId: decodeURIComponent(deleteIdeaMatch[2] ?? "")
                });
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/venue-claims") {
                await handlers.handleCreate(req, res);
                return;
            }
            if (req.method === "GET" && normalizedPath === "/v1/venue-claims") {
                await handlers.handleList(req, res);
                return;
            }
            const patchMatch = /^\/v1\/venue-claims\/([^/]+)\/status$/.exec(normalizedPath);
            if (req.method === "PATCH" && patchMatch) {
                await handlers.handlePatchStatus(req, res, decodeURIComponent(patchMatch[1]));
                return;
            }
            if (req.method === "POST" && normalizedPath === "/v1/business-claims") {
                await handlers.handleCreateBusinessClaimDraft(req, res);
                return;
            }
            const businessClaimSubmitMatch = /^\/v1\/business-claims\/([^/]+)\/submit$/.exec(normalizedPath);
            if (req.method === "POST" && businessClaimSubmitMatch) {
                await handlers.handleSubmitClaim(req, res, decodeURIComponent(businessClaimSubmitMatch[1] ?? ""));
                return;
            }
            const businessClaimMatch = /^\/v1\/business-claims\/([^/]+)$/.exec(normalizedPath);
            if (req.method === "GET" && businessClaimMatch) {
                await handlers.handleGetClaim(req, res, decodeURIComponent(businessClaimMatch[1] ?? ""));
                return;
            }
            const businessClaimEvidenceMatch = /^\/v1\/business-claims\/([^/]+)\/evidence$/.exec(normalizedPath);
            if (businessClaimEvidenceMatch && req.method === "POST") {
                await handlers.handleAddEvidence(req, res, decodeURIComponent(businessClaimEvidenceMatch[1] ?? ""));
                return;
            }
            if (businessClaimEvidenceMatch && req.method === "GET") {
                await handlers.handleListEvidence(req, res, decodeURIComponent(businessClaimEvidenceMatch[1] ?? ""));
                return;
            }
            const businessClaimReviewMatch = /^\/v1\/admin\/business-claims\/([^/]+)\/review$/.exec(normalizedPath);
            if (req.method === "POST" && businessClaimReviewMatch) {
                await handlers.handleReviewClaim(req, res, decodeURIComponent(businessClaimReviewMatch[1] ?? ""));
                return;
            }
            const ownershipRevokeMatch = /^\/v1\/admin\/business-ownership\/([^/]+)\/revoke$/.exec(normalizedPath);
            if (req.method === "POST" && ownershipRevokeMatch) {
                await handlers.handleRevokeOwnership(req, res, decodeURIComponent(ownershipRevokeMatch[1] ?? ""));
                return;
            }
            const manageDescriptionMatch = /^\/places\/([^/]+)\/business-management\/description$/.exec(normalizedPath);
            if (manageDescriptionMatch && req.method === "PUT") {
                await handlers.handleUpdateOfficialDescription(req, res, decodeURIComponent(manageDescriptionMatch[1] ?? ""));
                return;
            }
            const manageCategoryMatch = /^\/places\/([^/]+)\/business-management\/categories$/.exec(normalizedPath);
            if (manageCategoryMatch && req.method === "POST") {
                await handlers.handleSubmitCategorySuggestion(req, res, decodeURIComponent(manageCategoryMatch[1] ?? ""));
                return;
            }
            const manageHoursMatch = /^\/places\/([^/]+)\/business-management\/hours$/.exec(normalizedPath);
            if (manageHoursMatch && req.method === "PUT") {
                await handlers.handleUpdateManagedHours(req, res, decodeURIComponent(manageHoursMatch[1] ?? ""));
                return;
            }
            const manageLinksMatch = /^\/places\/([^/]+)\/business-management\/links$/.exec(normalizedPath);
            if (manageLinksMatch && req.method === "POST") {
                await handlers.handleUpsertBusinessLink(req, res, decodeURIComponent(manageLinksMatch[1] ?? ""));
                return;
            }
            const manageCatalogMatch = /^\/places\/([^/]+)\/business-management\/(menu|services)$/.exec(normalizedPath);
            if (manageCatalogMatch && req.method === "PUT") {
                await handlers.handleUpsertMenuServices(req, res, decodeURIComponent(manageCatalogMatch[1] ?? ""));
                return;
            }
            const manageImageMatch = /^\/places\/([^/]+)\/business-management\/gallery$/.exec(normalizedPath);
            if (manageImageMatch && req.method === "POST") {
                await handlers.handleUpsertBusinessImage(req, res, decodeURIComponent(manageImageMatch[1] ?? ""));
                return;
            }
            const manageContactsMatch = /^\/places\/([^/]+)\/business-management\/contacts$/.exec(normalizedPath);
            if (manageContactsMatch && req.method === "POST") {
                await handlers.handleUpsertBusinessContactMethod(req, res, decodeURIComponent(manageContactsMatch[1] ?? ""));
                return;
            }
            if (manageContactsMatch && req.method === "GET") {
                await handlers.handleListBusinessContactMethods(req, res, decodeURIComponent(manageContactsMatch[1] ?? ""));
                return;
            }
            const verifyContactMatch = /^\/places\/([^/]+)\/business-management\/contacts\/([^/]+)\/verify$/.exec(normalizedPath);
            if (verifyContactMatch && req.method === "POST") {
                await handlers.handleVerifyBusinessContactMethod(req, res, decodeURIComponent(verifyContactMatch[1] ?? ""), decodeURIComponent(verifyContactMatch[2] ?? ""));
                return;
            }
            const trustStatusMatch = /^\/places\/([^/]+)\/business-management\/trust$/.exec(normalizedPath);
            if (trustStatusMatch && req.method === "GET") {
                await handlers.handleBusinessTrustStatus(req, res, decodeURIComponent(trustStatusMatch[1] ?? ""));
                return;
            }
            const publicTrustMatch = /^\/v1\/places\/([^/]+)\/trust$/.exec(normalizedPath);
            if (publicTrustMatch && req.method === "GET") {
                await handlers.handlePublicBusinessTrust(req, res, decodeURIComponent(publicTrustMatch[1] ?? ""));
                return;
            }
            const adminTrustMatch = /^\/v1\/admin\/business-trust\/([^/]+)$/.exec(normalizedPath);
            if (adminTrustMatch && req.method === "GET") {
                if (!assertAdmin(req)) {
                    sendJson(res, 401, { error: "Unauthorized" });
                    return;
                }
                await handlers.handleAdminBusinessTrust(req, res, decodeURIComponent(adminTrustMatch[1] ?? ""));
                return;
            }
            const managePlaceMatch = /^\/places\/([^/]+)\/business-management$/.exec(normalizedPath);
            if (managePlaceMatch && req.method === "GET") {
                await handlers.handlePlaceManagementState(req, res, decodeURIComponent(managePlaceMatch[1] ?? ""));
                return;
            }
            if (managePlaceMatch && req.method === "POST") {
                await handlers.handleUpsertOfficialContent(req, res, decodeURIComponent(managePlaceMatch[1] ?? ""));
                return;
            }
            if (normalizedPath.startsWith("/v1/admin/")) {
                if (!assertAdmin(req)) {
                    sendJson(res, 401, { error: "Unauthorized" });
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/admin/promoted") {
                    await merchantHandlers.createPromoted(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/admin/promoted") {
                    await merchantHandlers.listPromoted(req, res);
                    return;
                }
                if (req.method === "PATCH" && /^\/v1\/admin\/promoted\/[^/]+$/.test(normalizedPath)) {
                    await merchantHandlers.patchPromoted(req, res);
                    return;
                }
                if (req.method === "DELETE" && /^\/v1\/admin\/promoted\/[^/]+$/.test(normalizedPath)) {
                    await merchantHandlers.deletePromoted(req, res);
                    return;
                }
                if (req.method === "POST" && normalizedPath === "/v1/admin/specials") {
                    await merchantHandlers.createSpecial(req, res);
                    return;
                }
                if (req.method === "GET" && normalizedPath === "/v1/admin/specials") {
                    await merchantHandlers.listSpecials(req, res);
                    return;
                }
                if (req.method === "PATCH" && /^\/v1\/admin\/specials\/[^/]+$/.test(normalizedPath)) {
                    await merchantHandlers.patchSpecial(req, res);
                    return;
                }
                if (req.method === "DELETE" && /^\/v1\/admin\/specials\/[^/]+$/.test(normalizedPath)) {
                    await merchantHandlers.deleteSpecial(req, res);
                    return;
                }
                if (subscriptionHandlers && req.method === "POST" && normalizedPath === "/v1/admin/subscription/override") {
                    await subscriptionHandlers.adminOverrideEntitlement(req, res);
                    return;
                }
                if (subscriptionHandlers && req.method === "POST" && normalizedPath === "/v1/admin/subscription/grant-trial") {
                    await subscriptionHandlers.adminGrantTrial(req, res);
                    return;
                }
                if (subscriptionHandlers && req.method === "POST" && normalizedPath === "/v1/admin/subscription/comp") {
                    await subscriptionHandlers.adminCompPlan(req, res);
                    return;
                }
                if (subscriptionHandlers && req.method === "GET" && normalizedPath === "/v1/admin/subscription/state") {
                    await subscriptionHandlers.adminGetState(req, res);
                    return;
                }
            }
            sendJson(res, 404, { error: "Not Found" });
        }
        catch (error) {
            if (normalizedPath.startsWith("/v1/admin/")) {
                handleMerchantHttpError(res, error);
                return;
            }
            if (error instanceof ValidationError) {
                sendJson(res, 400, { error: error.message, details: error.details });
                return;
            }
            if (error instanceof RolloutAccessError) {
                sendJson(res, 423, rolloutErrorPayload(error));
                return;
            }
            if (error instanceof GooglePlacesError) {
                sendJson(res, error.statusCode, {
                    error: error.message,
                    code: error.code,
                    details: error.details
                });
                return;
            }
            sendJson(res, 500, { error: "Internal Server Error" });
        }
    };
}
function logCategoryDiagnostics(input) {
    const topScoringReasons = [...input.scoreMap.values()]
        .sort((left, right) => right.score - left.score)
        .slice(0, 5)
        .map((score) => score.reasons.slice(0, 2).join(","))
        .filter(Boolean);
    const rejectedPreview = input.rejected.slice(0, 10).map((entry) => ({
        id: entry.place.id,
        title: entry.place.displayName?.text ?? "Untitled",
        reason: entry.reason
    }));
    console.info(JSON.stringify({
        event: "category_intelligence",
        category: input.category,
        queryTerms: input.queryTerms,
        includedTypes: input.includedTypes,
        returnedCount: input.returnedCount,
        filteredOutCount: input.filteredOutCount,
        topScoringReasons,
        rejectedPreview
    }));
}
function logGeoRouteMatch(method, pathname, normalizedPath) {
    if (process.env.NODE_ENV === "production")
        return;
    console.info("[geo.route.match]", {
        method: method ?? "UNKNOWN",
        pathname,
        normalizedPath
    });
}
function normalizeAliasPath(pathname) {
    if (pathname === "/api" || pathname === "/v1") {
        return "/";
    }
    if (pathname.startsWith("/api/")) {
        return pathname.slice("/api".length);
    }
    const v1AliasPaths = ["/plans", "/live-results", "/health", "/photo", "/photos", "/photos/media", "/places/photo", "/places"];
    if (pathname.startsWith("/v1/")) {
        const withoutPrefix = pathname.slice("/v1".length);
        if (v1AliasPaths.some((aliasPath) => withoutPrefix === aliasPath || withoutPrefix.startsWith(`${aliasPath}/`))) {
            return withoutPrefix;
        }
    }
    return pathname;
}
function parseRequiredNumber(searchParams, paramName) {
    const raw = searchParams.get(paramName);
    if (raw === null || raw.trim() === "") {
        throw new GooglePlacesError("invalid_input", `${paramName} query parameter is required`, 400, { field: paramName });
    }
    return Number(raw);
}

import { fileURLToPath } from "node:url";
import { MemoryAccountsStore } from "../accounts/memoryStore.js";
import { AccountsService } from "../accounts/service.js";
import { MemoryCreatorStore } from "../creator/memoryStore.js";
import { CreatorService } from "../creator/service.js";
import { CreatorVerificationService, MemoryCreatorVerificationStore } from "../creatorVerification/index.js";
import { CreatorPremiumService, MemoryCreatorPremiumStore } from "../creatorPremium/index.js";
import { CreatorMonetizationService, MemoryCreatorMonetizationStore } from "../creatorMonetization/index.js";
import { ClickTracker, MemoryClickStore } from "../analytics/clicks/index.js";
import { AnalyticsQueryService, AnalyticsService, MemoryAnalyticsStore } from "../analytics/index.js";
import { BusinessAnalyticsService, MemoryBusinessAnalyticsStore } from "../businessAnalytics/index.js";
import { BusinessPremiumService, MemoryBusinessPremiumStore } from "../businessPremium/index.js";
import { CollaborationService, MemoryCollaborationStore } from "../collaboration/index.js";
import { createDeckHandler } from "../api/sessions/deckHandler.js";
import { createIdeasHandlers } from "../api/sessions/ideasHandler.js";
import { InMemoryDiscoveryRepository } from "../discovery/memoryRepository.js";
import { RankingConfigResolver, RankingConfigService } from "../discovery/tuning.js";
import { CategoryBrowseService, CityPageService, DiscoveryFeedService, NearbyDiscoveryService, PlaceSearchService, RecommendationService, TrendingService } from "../discovery/services.js";
import { MemoryMerchantStore } from "../merchant/memoryStore.js";
import { MerchantService } from "../merchant/service.js";
import { BringYourOwnProvider, MemoryIdeasStore } from "../plans/bringYourOwn/index.js";
import { ProviderRouter } from "../plans/router/providerRouter.js";
import { MemoryTelemetryStore } from "../telemetry/memoryStore.js";
import { MemoryReviewsStore } from "../reviews/memoryStore.js";
import { MemoryModerationAlertDispatcher, ModerationService, ReviewsModerationEnforcementAdapter, WebhookModerationAlertDispatcher } from "../moderation/index.js";
import { MemoryNotificationStore, NotificationService } from "../notifications/index.js";
import { DevBillingProvider } from "../subscriptions/billing/provider.js";
import { EntitlementPolicyService } from "../subscriptions/policy.js";
import { PremiumExperienceService } from "../subscriptions/premiumExperience.js";
import { FeatureQuotaEngine, MemoryAccessUsageStore } from "../subscriptions/accessEngine.js";
import { SubscriptionService } from "../subscriptions/service.js";
import { MemoryUsageStore } from "../subscriptions/usage.js";
import { TelemetryService } from "../telemetry/telemetryService.js";
import { createSavedHttpHandlers } from "../saved/http.js";
import { initBackendGeoRuntime } from "../geo/gateway.js";
import { SavedService } from "../saved/service.js";
import { MemorySavedStore } from "../saved/store.js";
import { createPlaceContentHttpHandlers, MemoryPlaceContentStore, PlaceContentService } from "../placeContent/index.js";
import { MemoryOutingPlannerStore, OutingPlannerService } from "../outingPlanner/index.js";
import { InMemoryPlaceStore, PlaceNormalizationService } from "../places/index.js";
import { VenueClaimsService } from "../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../venues/claims/memoryStore.js";
import { MemoryRolloutStore } from "../rollouts/store.js";
import { rolloutSeedForLocalDev, RolloutService } from "../rollouts/service.js";
import { MemoryVideoPlatformStore, VideoPlatformService } from "../videoPlatform/index.js";
import { createOnboardingHttpHandlers, MemoryOnboardingStore, OnboardingService } from "../onboarding/index.js";
import { TrustSafetyService } from "../trustSafety/index.js";
import { AccomplishmentsService, MemoryAccomplishmentsStore } from "../accomplishments/index.js";
import { ChallengesService, MemoryChallengesStore } from "../challenges/index.js";
import { LeaderboardsService, MemoryLeaderboardsStore } from "../leaderboards/index.js";
import { CollectionsService, MemoryCollectionStore } from "../collections/index.js";
import { MemorySocialGamificationStore, SocialGamificationService } from "../socialGamification/index.js";
import { GamificationControlService, MemoryGamificationControlStore } from "../gamificationControl/index.js";
import { MemoryDryadRewardsStore, DryadRewardsService } from "../perbugRewards/index.js";
import { MemoryDryadTipsStore, DryadTipsService } from "../perbugTips/index.js";
import { CompetitionService, MemoryCompetitionStore } from "../competition/index.js";
import { MemorySponsoredLocationStore, SponsoredLocationsService } from "../sponsoredLocations/index.js";
import { MemoryDryadEconomyStore, DryadEconomyService } from "../perbugEconomy/index.js";
import { MemoryViewerEngagementStore, ViewerEngagementRewardsService } from "../viewerEngagementRewards/index.js";
import { DryadMarketplaceService } from "../dryad/service.js";
import { MemoryWalletAuthStore, WalletAuthService } from "../walletAuth/index.js";
import { createPerbugWorldHttpHandlers, MemoryPerbugWorldStore, PerbugWorldService } from "../perbugWorld/index.js";
import { PerbugMarketplaceService, seedMarketplaceListings } from "../perbugMarketplace/index.js";
import { createHttpServer } from "./httpServer.js";
function createDefaultDeckRouter(sharedIdeasStore) {
    return new ProviderRouter({
        providers: [new BringYourOwnProvider(sharedIdeasStore)],
        includeDebug: true,
        cache: {
            enabled: false
        }
    });
}
export function createServer(options) {
    const claimsStore = new MemoryVenueClaimStore();
    const service = new VenueClaimsService(claimsStore);
    const merchantService = new MerchantService(new MemoryMerchantStore());
    const ideasStore = options?.ideasStore ?? new MemoryIdeasStore();
    const deckRouter = options?.deckRouter ?? createDefaultDeckRouter(ideasStore);
    const clickStore = new MemoryClickStore();
    const clickTracker = new ClickTracker(clickStore);
    const telemetryStore = new MemoryTelemetryStore();
    const telemetryService = new TelemetryService(telemetryStore, { clickTracker });
    const analyticsService = new AnalyticsService(new MemoryAnalyticsStore());
    const analyticsQueryService = new AnalyticsQueryService(analyticsService);
    const reviewsStore = new MemoryReviewsStore();
    let videoPlatformService;
    const notificationStore = new MemoryNotificationStore();
    const notificationService = new NotificationService(notificationStore);
    const moderationAlertDispatcher = process.env.MODERATION_EMAIL_API_URL
        ? new WebhookModerationAlertDispatcher({
            endpoint: process.env.MODERATION_EMAIL_API_URL,
            apiKey: process.env.MODERATION_EMAIL_API_KEY,
            fromEmail: process.env.MODERATION_EMAIL_FROM ?? "moderation@dryad.dev",
            reviewBaseUrl: process.env.MODERATION_REVIEW_BASE_URL ?? "https://admin.dryad.dev"
        })
        : new MemoryModerationAlertDispatcher();
    const moderationService = new ModerationService({
        enforcement: new ReviewsModerationEnforcementAdapter(reviewsStore),
        alertDispatcher: moderationAlertDispatcher,
        reportAlertRecipient: process.env.MODERATION_ALERT_EMAIL ?? "dryadtoken@gmail.com",
        targetContextLoader: async (target) => {
            if (target.targetType !== "place_review_video")
                return undefined;
            const video = await videoPlatformService?.getVideoById?.(target.targetId);
            return video ? {
                videoId: video.id, uploaderUserId: video.authorUserId, placeId: video.canonicalPlaceId, title: video.title, caption: video.caption, moderationSummary: video.moderationSummary, evidence: video.moderationEvidence, playbackUrl: video.processedPlaybackUrl, thumbnailUrl: video.thumbnailPlaybackUrl
            } : undefined;
        }
    });
    const trustSafetyService = new TrustSafetyService(moderationService);
    const usageStore = new MemoryUsageStore();
    const subscriptionService = new SubscriptionService(usageStore, new DevBillingProvider(), {
        onEvent: async (event, subscription) => {
            const mapping = {
                trial_started: "trial_started",
                plan_changed: "subscription_purchased",
                payment_failed: "subscription_renewal_failed",
                grace_started: "grace_period_entered",
                canceled: "subscription_cancellation_requested",
                activated: "subscription_renewed"
            };
            const eventName = mapping[event.type];
            if (!eventName)
                return;
            await analyticsService.track({
                eventName: eventName,
                subscriptionId: subscription.id,
                metadata: { targetType: subscription.targetType, targetId: subscription.targetId, reasonCode: event.payload?.reasonCode }
            }, {
                actorUserId: event.targetId,
                actorProfileType: "system",
                platform: "backend",
                environment: process.env.NODE_ENV ?? "dev"
            });
        }
    });
    const entitlementPolicy = new EntitlementPolicyService(subscriptionService);
    const premiumExperience = new PremiumExperienceService(subscriptionService);
    const accessEngine = new FeatureQuotaEngine(subscriptionService, new MemoryAccessUsageStore());
    const accountsService = new AccountsService(new MemoryAccountsStore());
    const creatorStore = new MemoryCreatorStore();
    const monetizationService = new CreatorMonetizationService(new MemoryCreatorMonetizationStore(), accountsService, subscriptionService, creatorStore, accessEngine);
    const creatorVerificationService = new CreatorVerificationService(new MemoryCreatorVerificationStore(), {
        getCreatorProfileByUserId: (userId) => creatorStore.listProfiles().find((profile) => profile.userId === userId) ?? accountsService.getIdentitySummary(userId).creatorProfile,
        getCreatorProfileById: (creatorProfileId) => creatorStore.getProfileById(creatorProfileId),
        updateCreatorProfile: (profile) => creatorStore.saveProfile(profile),
        getUser: (userId) => accountsService.getIdentitySummary(userId).user
    });
    const creatorService = new CreatorService(creatorStore, accountsService, reviewsStore, subscriptionService, accessEngine, monetizationService, creatorVerificationService, notificationService);
    const creatorPremiumService = new CreatorPremiumService(new MemoryCreatorPremiumStore(), subscriptionService, {
        getCreatorProfile: (creatorProfileId) => creatorStore.getProfileById(creatorProfileId)
    });
    const savedService = new SavedService(new MemorySavedStore(), subscriptionService, accessEngine);
    const placeContentService = new PlaceContentService(new MemoryPlaceContentStore(), options?.logger);
    const businessPremiumService = new BusinessPremiumService(new MemoryBusinessPremiumStore());
    const businessAnalyticsService = new BusinessAnalyticsService(new MemoryBusinessAnalyticsStore(), claimsStore, accessEngine, businessPremiumService);
    const collaborationService = new CollaborationService(new MemoryCollaborationStore(), accountsService, service, subscriptionService, accessEngine, businessAnalyticsService, businessPremiumService, notificationService);
    const discoveryRepository = new InMemoryDiscoveryRepository();
    const placeService = new PlaceNormalizationService(new InMemoryPlaceStore());
    const rankingConfigService = new RankingConfigService();
    const rankingConfigResolver = new RankingConfigResolver(rankingConfigService);
    const outingPlannerService = new OutingPlannerService({
        listPlaces: () => discoveryRepository.listPlaces(),
        creatorStore,
        store: new MemoryOutingPlannerStore(),
        subscriptions: subscriptionService,
        access: accessEngine
    });
    const placeSearchService = new PlaceSearchService(discoveryRepository, rankingConfigResolver);
    const categoryBrowseService = new CategoryBrowseService(discoveryRepository, rankingConfigResolver);
    const nearbyService = new NearbyDiscoveryService(discoveryRepository, rankingConfigResolver);
    const trendingService = new TrendingService(discoveryRepository, rankingConfigResolver);
    const recommendationService = new RecommendationService(discoveryRepository, premiumExperience, rankingConfigResolver);
    const cityPageService = new CityPageService(trendingService, recommendationService, categoryBrowseService);
    const discoveryFeedService = new DiscoveryFeedService(recommendationService, nearbyService, trendingService, categoryBrowseService, placeSearchService, premiumExperience);
    const deckHandler = createDeckHandler({
        router: deckRouter,
        logger: options?.logger,
        config: options?.config
    });
    const ideasHandlers = createIdeasHandlers({
        ideasStore,
        logger: options?.logger
    });
    const rolloutService = new RolloutService(new MemoryRolloutStore(rolloutSeedForLocalDev()), accountsService, subscriptionService);
    const geoRuntime = initBackendGeoRuntime();
    console.info("[geo.startup]", {
        mode: geoRuntime.mode,
        modeReason: geoRuntime.modeReason,
        customGeoServiceEnabled: geoRuntime.customGeoServiceEnabled,
        effectiveGeoServiceEnabled: geoRuntime.effectiveGeoServiceEnabled,
        routesMounted: geoRuntime.routesMounted,
        customGeoBaseUrl: geoRuntime.customGeoBaseUrl ?? null,
        effectiveGeoServiceBaseUrl: geoRuntime.effectiveGeoServiceBaseUrl ?? null,
        nominatimBaseUrl: geoRuntime.nominatimBaseUrl ?? null,
        effectiveNominatimBaseUrl: geoRuntime.effectiveNominatimBaseUrl ?? null,
        upstreamBaseUrl: geoRuntime.upstreamBaseUrl ?? null,
        validationErrors: geoRuntime.validationErrors,
        validationWarnings: geoRuntime.validationWarnings
    });
    videoPlatformService = new VideoPlatformService(new MemoryVideoPlatformStore(), {
        awsRegion: process.env.AWS_REGION ?? "us-east-1",
        rawBucket: process.env.AWS_S3_VIDEO_RAW_BUCKET ?? "dryad-media-raw-dev",
        processedBucket: process.env.AWS_S3_VIDEO_PROCESSED_BUCKET ?? "dryad-media-processed-dev",
        cloudFrontBaseUrl: process.env.AWS_CLOUDFRONT_MEDIA_BASE_URL,
        uploadTtlSeconds: Number.parseInt(process.env.VIDEO_UPLOAD_URL_TTL_SECONDS ?? "900", 10),
        maxUploadBytes: Number.parseInt(process.env.VIDEO_MAX_UPLOAD_BYTES ?? String(2 * 1024 * 1024 * 1024), 10),
        multipartThresholdBytes: Number.parseInt(process.env.VIDEO_MULTIPART_THRESHOLD_BYTES ?? String(50 * 1024 * 1024), 10)
    }, undefined, undefined, moderationService, trustSafetyService, notificationService);
    const onboardingService = new OnboardingService(new MemoryOnboardingStore(), videoPlatformService);
    const accomplishmentsService = new AccomplishmentsService(new MemoryAccomplishmentsStore(), analyticsService, notificationService);
    const challengesService = new ChallengesService(new MemoryChallengesStore(), analyticsService, notificationService);
    const leaderboardsService = new LeaderboardsService(new MemoryLeaderboardsStore(), analyticsService, notificationService);
    const collectionsService = new CollectionsService(new MemoryCollectionStore(), analyticsService, notificationService);
    const socialGamificationService = new SocialGamificationService(new MemorySocialGamificationStore(), analyticsService, notificationService);
    const gamificationControlService = new GamificationControlService(new MemoryGamificationControlStore(), analyticsService);
    const dryadRewardsService = new DryadRewardsService(new MemoryDryadRewardsStore());
    dryadRewardsService.createPlace({ id: "place-1", name: "Dryad Test Cafe" });
    dryadRewardsService.createPlace({ id: "place-2", name: "Dryad Arcade" });
    const dryadTipsService = new DryadTipsService(new MemoryDryadTipsStore(), {
        getVideo: (videoId) => videoPlatformService?.getVideoById(videoId),
        getPrimaryWallet: (userId) => dryadRewardsService.listWallets(userId).find((wallet) => wallet.isPrimary)
    });
    const competitionService = new CompetitionService(new MemoryCompetitionStore(), dryadRewardsService);
    const sponsoredLocationsService = new SponsoredLocationsService(new MemorySponsoredLocationStore(), {
        placeCoordinates: (placeId) => {
            const place = placeService.getCanonicalPlace(placeId);
            if (!place)
                return null;
            return { lat: place.latitude, lng: place.longitude };
        },
        onUserRewardPaid: async () => { }
    });
    competitionService.recordVideoPublished({ videoId: "video_seed_1", reviewId: "review_seed_1", userId: "u1", publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), city: "Bloomington", category: "coffee", canonicalPlaceId: "place-1" });
    competitionService.recordApprovedReview({ id: "review_event_1", reviewId: "review_seed_1", videoId: "video_seed_1", userId: "u1", canonicalPlaceId: "place-1", approvedAt: new Date().toISOString(), city: "Bloomington", category: "coffee", discoveryType: "first_review", approved: true, blocked: false });
    competitionService.recordLike({ id: "like_seed_1", videoId: "video_seed_1", userId: "fan_1", createdAt: new Date().toISOString(), valid: true, bannedUser: false, blockedUser: false, fraudFlagged: false });
    const seededTrees = [
        {
            treeId: "tree-001",
            nftTokenId: "1001",
            place: { placeId: "place-1", label: "Mission Creek Boardwalk, San Francisco", lat: 37.7701, lng: -122.391 },
            founder: "0x1111111111111111111111111111111111111111",
            owner: "0x2222222222222222222222222222222222222222",
            growthLevel: 8,
            contributionCount: 42,
            listedPriceEth: "0.38"
        },
        {
            treeId: "tree-002",
            nftTokenId: "1002",
            place: { placeId: "place-2", label: "Dolores Outlook, San Francisco", lat: 37.7597, lng: -122.4269 },
            founder: "0x1111111111111111111111111111111111111111",
            owner: "0x1111111111111111111111111111111111111111",
            growthLevel: 4,
            contributionCount: 11
        },
        {
            treeId: "tree-003",
            nftTokenId: "1003",
            place: { placeId: "place-3", label: "South Congress Plaza, Austin", lat: 30.2492, lng: -97.7502 },
            founder: "0x3333333333333333333333333333333333333333",
            owner: "0x4444444444444444444444444444444444444444",
            growthLevel: 6,
            contributionCount: 23,
            listedPriceEth: "0.74"
        },
        {
            treeId: "tree-004",
            nftTokenId: "1004",
            place: { placeId: "place-4", label: "Riverside Pocket Park, Austin", lat: 30.265, lng: -97.744 },
            founder: "0x0000000000000000000000000000000000000000",
            owner: "0x0000000000000000000000000000000000000000",
            growthLevel: 0,
            contributionCount: 0
        }
    ];
    const dryadMarketplaceService = new DryadMarketplaceService(seededTrees, [], [
        { spotId: "spot-100", placeId: "spot-100", label: "Oracle Meadow, SF", lat: 37.7682, lng: -122.401, claimState: "unclaimed" },
        { spotId: "spot-101", placeId: "spot-101", label: "Golden Path Grove, SF", lat: 37.7714, lng: -122.4032, claimState: "unclaimed" },
        { spotId: "spot-102", placeId: "spot-102", label: "South Congress Bloomfield, Austin", lat: 30.248, lng: -97.752, claimState: "unclaimed" },
    ]);
    const walletAuthService = new WalletAuthService(new MemoryWalletAuthStore(), accountsService);
    const dryadEconomyService = new DryadEconomyService(new MemoryDryadEconomyStore());
    const perbugWorldService = new PerbugWorldService(new MemoryPerbugWorldStore());
    const perbugMarketplaceService = new PerbugMarketplaceService(seedMarketplaceListings());
    const perbugWorldHandlers = createPerbugWorldHttpHandlers(perbugWorldService);
    const viewerEngagementRewardsService = new ViewerEngagementRewardsService(new MemoryViewerEngagementStore(), {
        getVideoContext: (videoId) => ({ creatorId: `creator_${videoId}`, placeId: `place_${videoId}` }),
        analytics: analyticsService
    });
    dryadEconomyService.creditUser("u1", 500, "seed");
    dryadEconomyService.creditUser("u2", 250, "seed");
    dryadEconomyService.creditUser("u3", 180, "seed");
    dryadEconomyService.creditBusiness("biz_owner_seed", 1000, "seed");
    dryadEconomyService.creditUser("creator_seed", 300, "seed");
    dryadEconomyService.creditUser("curator_seed", 250, "seed");
    dryadEconomyService.upsertCollection({
        id: "collection_downtown_coffee",
        title: "Downtown Coffee Circuit",
        placeIds: ["place-1", "place-2"],
        milestoneRewardsAtomic: [1000000n],
        completionRewardAtomic: 2500000n,
        active: true
    }, "seed");
    gamificationControlService.seedInitialRules("system");
    return createHttpServer(service, merchantService, {
        deckHandler,
        ideasHandlers,
        telemetryService,
        reviewsStore,
        moderationService,
        trustSafetyService,
        placeService,
        notificationService,
        subscriptionService,
        entitlementPolicy,
        accessEngine,
        accountsService,
        creatorService,
        creatorVerificationService,
        creatorMonetizationService: monetizationService,
        creatorPremiumService,
        businessAnalyticsService,
        collaborationService,
        businessPremiumService,
        savedHandlers: createSavedHttpHandlers(savedService),
        placeContentHandlers: createPlaceContentHttpHandlers(placeContentService),
        outingPlannerService,
        discovery: {
            searchService: placeSearchService,
            browseService: categoryBrowseService,
            nearbyService,
            trendingService,
            recommendationService,
            cityPageService,
            feedService: discoveryFeedService,
            premiumExperience,
            analyticsService
        },
        rankingTuning: { service: rankingConfigService, resolver: rankingConfigResolver, repo: discoveryRepository },
        analyticsService,
        analyticsQueryService,
        rolloutService,
        geoGateway: geoRuntime.gateway ?? undefined,
        geoStatus: geoRuntime,
        videoPlatformService,
        onboardingHandlers: createOnboardingHttpHandlers(onboardingService),
        accomplishmentsService,
        challengesService,
        leaderboardsService,
        collectionsService,
        socialGamificationService,
        gamificationControlService,
        dryadRewardsService,
        dryadTipsService,
        competitionService,
        sponsoredLocationsService,
        dryadEconomyService,
        viewerEngagementRewardsService,
        dryadMarketplaceService,
        walletAuthService,
        perbugWorldHandlers,
        perbugMarketplaceService
    });
}
export function main() {
    const port = Number(process.env.PORT ?? 8080);
    console.info("[api.startup]", {
        port,
        nodeEnv: process.env.NODE_ENV ?? "dev",
        appEnv: process.env.APP_ENV ?? null,
        geoMode: process.env.GEO_MODE ?? null,
        geoServiceEnabled: process.env.GEO_SERVICE_ENABLED ?? null,
        geoServiceBaseUrl: process.env.GEO_SERVICE_BASE_URL ?? null,
        nominatimBaseUrl: process.env.NOMINATIM_BASE_URL ?? null
    });
    const server = createServer();
    server.listen(port, () => {
        console.log(`Server listening on :${port}`);
    });
}
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1] === currentFilePath) {
    main();
}

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
import type { AppConfig } from "../config/schema.js";
import { InMemoryDiscoveryRepository } from "../discovery/memoryRepository.js";
import { RankingConfigResolver, RankingConfigService } from "../discovery/tuning.js";
import {
  CategoryBrowseService,
  CityPageService,
  DiscoveryFeedService,
  NearbyDiscoveryService,
  PlaceSearchService,
  RecommendationService,
  TrendingService
} from "../discovery/services.js";
import type { Logger } from "../logging/loggerTypes.js";
import { MemoryMerchantStore } from "../merchant/memoryStore.js";
import { MerchantService } from "../merchant/service.js";
import { BringYourOwnProvider, MemoryIdeasStore } from "../plans/bringYourOwn/index.js";
import type { IdeasStore } from "../plans/bringYourOwn/storage.js";
import { CuratedProvider } from "../plans/curated/index.js";
import { ProviderRouter } from "../plans/router/providerRouter.js";
import type { ProviderRouter as ProviderRouterType } from "../plans/router/providerRouter.js";
import { MemoryTelemetryStore } from "../telemetry/memoryStore.js";
import { MemoryReviewsStore } from "../reviews/memoryStore.js";
import { ModerationService, ReviewsModerationEnforcementAdapter } from "../moderation/index.js";
import { MemoryNotificationStore, NotificationService } from "../notifications/index.js";
import { DevBillingProvider } from "../subscriptions/billing/provider.js";
import { EntitlementPolicyService } from "../subscriptions/policy.js";
import { PremiumExperienceService } from "../subscriptions/premiumExperience.js";
import { FeatureQuotaEngine, MemoryAccessUsageStore } from "../subscriptions/accessEngine.js";
import { SubscriptionService } from "../subscriptions/service.js";
import { MemoryUsageStore } from "../subscriptions/usage.js";
import { TelemetryService } from "../telemetry/telemetryService.js";
import { createSavedHttpHandlers } from "../saved/http.js";
import { SavedService } from "../saved/service.js";
import { MemorySavedStore } from "../saved/store.js";
import { MemoryOutingPlannerStore, OutingPlannerService } from "../outingPlanner/index.js";
import { InMemoryPlaceStore, PlaceNormalizationService } from "../places/index.js";
import { VenueClaimsService } from "../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../venues/claims/memoryStore.js";
import { MemoryRolloutStore } from "../rollouts/store.js";
import { rolloutSeedForLocalDev, RolloutService } from "../rollouts/service.js";
import { createHttpServer } from "./httpServer.js";

export interface CreateServerOptions {
  deckRouter?: ProviderRouterType;
  ideasStore?: IdeasStore;
  logger?: Logger;
  config?: AppConfig;
}

function createDefaultDeckRouter(sharedIdeasStore: IdeasStore): ProviderRouter {
  return new ProviderRouter({
    providers: [new BringYourOwnProvider(sharedIdeasStore), new CuratedProvider()],
    includeDebug: true,
    cache: {
      enabled: false
    },
    neverEmpty: {
      enabled: true,
      curatedProviderName: "curated"
    }
  });
}

export function createServer(options?: CreateServerOptions) {
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
  const notificationStore = new MemoryNotificationStore();
  const notificationService = new NotificationService(notificationStore);
  const moderationService = new ModerationService(new ReviewsModerationEnforcementAdapter(reviewsStore));
  const usageStore = new MemoryUsageStore();
  const subscriptionService = new SubscriptionService(usageStore, new DevBillingProvider(), {
    onEvent: async (event, subscription) => {
      const mapping: Record<string, string> = {
        trial_started: "trial_started",
        plan_changed: "subscription_purchased",
        payment_failed: "subscription_renewal_failed",
        grace_started: "grace_period_entered",
        canceled: "subscription_cancellation_requested",
        activated: "subscription_renewed"
      };
      const eventName = mapping[event.type];
      if (!eventName) return;
      await analyticsService.track({
        eventName: eventName as never,
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
  const discoveryFeedService = new DiscoveryFeedService(
    recommendationService,
    nearbyService,
    trendingService,
    categoryBrowseService,
    placeSearchService,
    premiumExperience
  );

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

  return createHttpServer(service, merchantService, {
    deckHandler,
    ideasHandlers,
    telemetryService,
    reviewsStore,
    moderationService,
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
    rankingTuning: { service: rankingConfigService, resolver: rankingConfigResolver, repo: discoveryRepository }
    ,
    analyticsService,
    analyticsQueryService,
    rolloutService
  });
}

export function main(): void {
  const server = createServer();
  const port = Number(process.env.PORT ?? 8080);
  server.listen(port, () => {
    console.log(`Server listening on :${port}`);
  });
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1] === currentFilePath) {
  main();
}

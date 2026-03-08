import { fileURLToPath } from "node:url";

import { MemoryAccountsStore } from "../accounts/memoryStore.js";
import { AccountsService } from "../accounts/service.js";
import { MemoryCreatorStore } from "../creator/memoryStore.js";
import { CreatorService } from "../creator/service.js";
import { CreatorMonetizationService, MemoryCreatorMonetizationStore } from "../creatorMonetization/index.js";
import { ClickTracker, MemoryClickStore } from "../analytics/clicks/index.js";
import { BusinessAnalyticsService, MemoryBusinessAnalyticsStore } from "../businessAnalytics/index.js";
import { CollaborationService, MemoryCollaborationStore } from "../collaboration/index.js";
import { createDeckHandler } from "../api/sessions/deckHandler.js";
import { createIdeasHandlers } from "../api/sessions/ideasHandler.js";
import type { AppConfig } from "../config/schema.js";
import { InMemoryDiscoveryRepository } from "../discovery/memoryRepository.js";
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
import { DevBillingProvider } from "../subscriptions/billing/provider.js";
import { EntitlementPolicyService } from "../subscriptions/policy.js";
import { FeatureQuotaEngine, MemoryAccessUsageStore } from "../subscriptions/accessEngine.js";
import { SubscriptionService } from "../subscriptions/service.js";
import { MemoryUsageStore } from "../subscriptions/usage.js";
import { TelemetryService } from "../telemetry/telemetryService.js";
import { createSavedHttpHandlers } from "../saved/http.js";
import { SavedService } from "../saved/service.js";
import { MemorySavedStore } from "../saved/store.js";
import { VenueClaimsService } from "../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../venues/claims/memoryStore.js";
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
  const reviewsStore = new MemoryReviewsStore();
  const usageStore = new MemoryUsageStore();
  const subscriptionService = new SubscriptionService(usageStore, new DevBillingProvider());
  const entitlementPolicy = new EntitlementPolicyService(subscriptionService);
  const accessEngine = new FeatureQuotaEngine(subscriptionService, new MemoryAccessUsageStore());
  const accountsService = new AccountsService(new MemoryAccountsStore());
  const creatorStore = new MemoryCreatorStore();
  const monetizationService = new CreatorMonetizationService(new MemoryCreatorMonetizationStore(), accountsService, subscriptionService, creatorStore, accessEngine);
  const creatorService = new CreatorService(creatorStore, accountsService, reviewsStore, subscriptionService, accessEngine, monetizationService);
  const savedService = new SavedService(new MemorySavedStore(), subscriptionService, accessEngine);
  const businessAnalyticsService = new BusinessAnalyticsService(new MemoryBusinessAnalyticsStore(), claimsStore, accessEngine);
  const collaborationService = new CollaborationService(new MemoryCollaborationStore(), accountsService, service, subscriptionService, accessEngine, businessAnalyticsService);

  const discoveryRepository = new InMemoryDiscoveryRepository();
  const placeSearchService = new PlaceSearchService(discoveryRepository);
  const categoryBrowseService = new CategoryBrowseService(discoveryRepository);
  const nearbyService = new NearbyDiscoveryService(discoveryRepository);
  const trendingService = new TrendingService(discoveryRepository);
  const recommendationService = new RecommendationService(discoveryRepository);
  const cityPageService = new CityPageService(trendingService, recommendationService, categoryBrowseService);
  const discoveryFeedService = new DiscoveryFeedService(
    recommendationService,
    nearbyService,
    trendingService,
    categoryBrowseService,
    placeSearchService
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

  return createHttpServer(service, merchantService, {
    deckHandler,
    ideasHandlers,
    telemetryService,
    reviewsStore,
    subscriptionService,
    entitlementPolicy,
    accessEngine,
    accountsService,
    creatorService,
    creatorMonetizationService: monetizationService,
    businessAnalyticsService,
    collaborationService,
    savedHandlers: createSavedHttpHandlers(savedService),
    discovery: {
      searchService: placeSearchService,
      browseService: categoryBrowseService,
      nearbyService,
      trendingService,
      recommendationService,
      cityPageService,
      feedService: discoveryFeedService
    }
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

import { createServer as createNodeServer, type Server } from "node:http";

import type { SessionDeckHandler } from "../api/sessions/deckHandler.js";
import type { AccountsService } from "../accounts/service.js";
import type { CreatorService } from "../creator/service.js";
import type { CreatorVerificationService } from "../creatorVerification/service.js";
import type { CreatorMonetizationService } from "../creatorMonetization/service.js";
import type { CreatorPremiumService } from "../creatorPremium/service.js";
import type { BusinessAnalyticsService } from "../businessAnalytics/service.js";
import type { CollaborationService } from "../collaboration/service.js";
import type { BusinessPremiumService } from "../businessPremium/service.js";
import type { DiscoveryHttpHandlerDeps } from "../discovery/http.js";
import type { RankingConfigResolver, RankingConfigService } from "../discovery/tuning.js";
import type { PlaceDiscoveryRepository } from "../discovery/types.js";
import type { SessionIdeasHandlers } from "../api/sessions/ideasHandler.js";
import type { MerchantService } from "../merchant/service.js";
import type { EntitlementPolicyService } from "../subscriptions/policy.js";
import type { FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import type { TelemetryService } from "../telemetry/telemetryService.js";
import type { ReviewsStore } from "../reviews/store.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";
import type { SavedHttpHandlers } from "../saved/http.js";
import type { PlaceContentHttpHandlers } from "../placeContent/http.js";
import type { OutingPlannerService } from "../outingPlanner/service.js";
import type { ModerationService } from "../moderation/service.js";
import type { PlaceNormalizationService } from "../places/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { AnalyticsQueryService } from "../analytics/queryService.js";
import type { AnalyticsService } from "../analytics/service.js";
import type { RolloutService } from "../rollouts/service.js";
import type { GeoGateway } from "../geo/gateway.js";
import type { VideoPlatformService } from "../videoPlatform/service.js";
import type { TrustSafetyService } from "../trustSafety/service.js";
import type { OnboardingHttpHandlers } from "../onboarding/http.js";
import type { AccomplishmentsService } from "../accomplishments/service.js";
import type { ChallengesService } from "../challenges/service.js";
import type { LeaderboardsService } from "../leaderboards/service.js";
import type { CollectionsService } from "../collections/service.js";
import type { SocialGamificationService } from "../socialGamification/service.js";
import type { GamificationControlService } from "../gamificationControl/service.js";
import type { PerbugRewardsService } from "../perbugRewards/service.js";
import type { PerbugTipsService } from "../perbugTips/service.js";
import type { CompetitionService } from "../competition/service.js";
import type { SponsoredLocationsService } from "../sponsoredLocations/service.js";
import type { PerbugEconomyService } from "../perbugEconomy/service.js";
import { createRoutes } from "./routes.js";

export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (!patternPart || !pathPart) {
      return null;
    }

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

export function createHttpServer(
  service: VenueClaimsService,
  merchantService: MerchantService,
  deps?: {
    deckHandler?: SessionDeckHandler;
    ideasHandlers?: SessionIdeasHandlers;
    telemetryService?: TelemetryService;
    reviewsStore?: ReviewsStore;
    subscriptionService?: SubscriptionService;
    entitlementPolicy?: EntitlementPolicyService;
    accessEngine?: FeatureQuotaEngine;
    accountsService?: AccountsService;
    creatorService?: CreatorService;
    creatorVerificationService?: CreatorVerificationService;
    creatorMonetizationService?: CreatorMonetizationService;
    creatorPremiumService?: CreatorPremiumService;
    businessAnalyticsService?: BusinessAnalyticsService;
    collaborationService?: CollaborationService;
    businessPremiumService?: BusinessPremiumService;
    discovery?: DiscoveryHttpHandlerDeps;
    rankingTuning?: { service: RankingConfigService; resolver: RankingConfigResolver; repo: PlaceDiscoveryRepository };
    savedHandlers?: SavedHttpHandlers;
    placeContentHandlers?: PlaceContentHttpHandlers;
    outingPlannerService?: OutingPlannerService;
    moderationService?: ModerationService;
    trustSafetyService?: TrustSafetyService;
    placeService?: PlaceNormalizationService;
    notificationService?: NotificationService;
    analyticsService?: AnalyticsService;
    analyticsQueryService?: AnalyticsQueryService;
    rolloutService?: RolloutService;
    geoGateway?: GeoGateway;
    videoPlatformService?: VideoPlatformService;
    onboardingHandlers?: OnboardingHttpHandlers;
    accomplishmentsService?: AccomplishmentsService;
    challengesService?: ChallengesService;
    leaderboardsService?: LeaderboardsService;
    collectionsService?: CollectionsService;
    socialGamificationService?: SocialGamificationService;
    gamificationControlService?: GamificationControlService;
    perbugRewardsService?: PerbugRewardsService;
    perbugTipsService?: PerbugTipsService;
    competitionService?: CompetitionService;
    sponsoredLocationsService?: SponsoredLocationsService;
    perbugEconomyService?: PerbugEconomyService;
  }
): Server {
  const route = createRoutes(service, merchantService, deps);
  return createNodeServer((req, res) => {
    void route(req, res);
  });
}

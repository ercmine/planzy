import type { IncomingMessage, ServerResponse } from "node:http";

import type { SessionDeckHandler } from "../api/sessions/deckHandler.js";
import { createAccountsHttpHandlers } from "../accounts/http.js";
import type { AccountsService } from "../accounts/service.js";
import { PermissionAction, ProfileType } from "../accounts/types.js";
import type { ActorContextResolved } from "../accounts/types.js";
import type { SessionIdeasHandlers } from "../api/sessions/ideasHandler.js";
import { handleMerchantHttpError, createMerchantHttpHandlers } from "../merchant/http.js";
import type { MerchantService } from "../merchant/service.js";
import { ValidationError } from "../plans/errors.js";
import { createSubscriptionHttpHandlers } from "../subscriptions/http.js";
import type { EntitlementPolicyService } from "../subscriptions/policy.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import {
  buildCategorySearchPlan,
  getCategoryDefinition,
  rankAndFilterCategoryResults,
  type CategoryScore
} from "../services/categoryIntelligence.js";
import { categoryToIncludedTypes, fetchPlaceDetail, GooglePlacesError, searchNearby } from "../services/googlePlaces.js";
import { createTelemetryHttpHandlers } from "../telemetry/http.js";
import type { TelemetryService } from "../telemetry/telemetryService.js";
import { createVenueClaimsHttpHandlers, parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";
import type { ReviewsStore } from "../reviews/store.js";

const DEFAULT_PUBLIC_API_BASE_URL = "https://api.perbug.com";
const DEFAULT_GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL = "https://places.googleapis.com/v1";

export function applyCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-admin-key, x-request-id, x-acting-profile-type, x-acting-profile-id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
}

function assertAdmin(req: IncomingMessage): boolean {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey) return false;
  return readHeader(req, "x-admin-key") === expectedKey;
}

export function createRoutes(
  service: VenueClaimsService,
  merchantService: MerchantService,
  deps?: {
    deckHandler?: SessionDeckHandler;
    ideasHandlers?: SessionIdeasHandlers;
    telemetryService?: TelemetryService;
    reviewsStore?: ReviewsStore;
    subscriptionService?: SubscriptionService;
    entitlementPolicy?: EntitlementPolicyService;
    accountsService?: AccountsService;
  }
) {
  const handlers = createVenueClaimsHttpHandlers(service);
  const merchantHandlers = createMerchantHttpHandlers(merchantService);
  const telemetryHandlers = deps?.telemetryService ? createTelemetryHttpHandlers(deps.telemetryService) : null;
  const subscriptionHandlers = deps?.subscriptionService && deps?.entitlementPolicy
    ? createSubscriptionHttpHandlers(deps.subscriptionService, deps.entitlementPolicy)
    : null;
  const accountHandlers = deps?.accountsService ? createAccountsHttpHandlers(deps.accountsService) : null;

  return async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    applyCors(res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);
    const normalizedPath = normalizeAliasPath(url.pathname);

    try {
      if (req.method === "GET" && normalizedPath === "/") {
        sendJson(res, 200, {
          service: "perbug-api",
          version: "1.0.0"
        });
        return;
      }

      if (req.method === "GET" && normalizedPath === "/health") {
        sendJson(res, 200, {
          ok: true,
          service: "perbug-api",
          version: "1.0.0",
          time: new Date().toISOString()
        });
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
        const sourcePriority = new Map<string, number>();
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
          .map((photo) => ({
            name: photo.name,
            url: photo.name
              ? `${publicApiBaseUrl}/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=1200`
              : undefined
          }))
          .filter((photo) => Boolean(photo.name));

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

      const reviewsMatch = /^\/places\/([^/]+)\/reviews$/.exec(normalizedPath);
      if (reviewsMatch && deps?.reviewsStore) {
        const placeId = decodeURIComponent(reviewsMatch[1] ?? "");

        if (req.method === "GET") {
          const reviews = await deps.reviewsStore.listByPlace(placeId);
          sendJson(res, 200, { reviews });
          return;
        }

        if (req.method === "POST") {
          const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
          if (!userIdHeader) {
            throw new ValidationError(["x-user-id header is required"]);
          }

          let actor: ActorContextResolved = {
            userId: userIdHeader,
            profileType: ProfileType.PERSONAL,
            profileId: userIdHeader,
            roles: []
          };

          if (deps?.accountsService) {
            const requestedProfileType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
            const requestedProfileId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
            actor = deps.accountsService.resolveActingContext(
              userIdHeader,
              requestedProfileType && requestedProfileId
                ? { profileType: requestedProfileType as ProfileType, profileId: requestedProfileId }
                : undefined
            );
          }

          if (deps?.entitlementPolicy && deps?.subscriptionService) {
            let subscriptionAccountId = userIdHeader;
            let subscriptionAccountType: string = "USER";
            if (deps?.accountsService) {
              const target = deps.accountsService.resolveSubscriptionTarget(actor);
              subscriptionAccountId = target.accountId;
              subscriptionAccountType = target.accountType;
            }

            deps.subscriptionService.ensureAccount(subscriptionAccountId, subscriptionAccountType as never);
            const decision = await deps.entitlementPolicy.can(subscriptionAccountId, "create_review");
            if (!decision.allowed) {
              sendJson(res, 403, { error: decision.reasonCode, message: decision.message, requiredPlan: decision.requiredPlan });
              return;
            }

            const resolved = deps.subscriptionService.getCurrentEntitlements(subscriptionAccountId).values;
            const quotaDecision = await deps.entitlementPolicy.checkQuota(subscriptionAccountId, "text_reviews", Number(resolved.max_text_reviews_per_month));
            if (!quotaDecision.allowed) {
              sendJson(res, 403, { error: quotaDecision.reasonCode, message: quotaDecision.message, usage: quotaDecision.usage, limit: quotaDecision.limit });
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

          const body = await parseJsonBody(req);
          if (!body || typeof body !== "object" || Array.isArray(body)) {
            throw new ValidationError(["body must be a JSON object"], "Invalid review payload");
          }

          const payload = body as Record<string, unknown>;
          const rating = Number(payload.rating);
          const text = String(payload.text ?? "").trim();
          const anonymous = Boolean(payload.anonymous);
          const userId = String(readHeader(req, "x-user-id") ?? payload.userId ?? "anonymous-user").trim();
          const displayNameRaw = String(payload.displayName ?? "").trim();
          const displayName = anonymous ? "Anonymous" : (displayNameRaw || "Perbug User");

          if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            throw new ValidationError(["rating must be between 1 and 5"], "Invalid review payload");
          }
          if (text.length < 5 || text.length > 1000) {
            throw new ValidationError(["text length must be between 5 and 1000 characters"], "Invalid review payload");
          }

          const created = await deps.reviewsStore.create({
            placeId,
            userId,
            actingProfileType: actor.profileType,
            actingProfileId: actor.profileId,
            displayName,
            rating: Math.round(rating),
            text,
            anonymous
          });

          if (subscriptionHandlers) {
            const usageAccountId = deps?.accountsService ? deps.accountsService.resolveSubscriptionTarget(actor).accountId : userId;
            await subscriptionHandlers.recordReviewUsage(usageAccountId);
          }

          sendJson(res, 201, { review: created });
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

      if (
        req.method === "GET" &&
        (normalizedPath === "/photo" || normalizedPath === "/photos" || normalizedPath === "/photos/media" || normalizedPath === "/places/photo")
      ) {
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
        const photoMediaBaseUrl =
          process.env.GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL ?? DEFAULT_GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL;
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
        } catch {
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
    } catch (error) {
      if (normalizedPath.startsWith("/v1/admin/")) {
        handleMerchantHttpError(res, error);
        return;
      }

      if (error instanceof ValidationError) {
        sendJson(res, 400, { error: error.message, details: error.details });
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

function logCategoryDiagnostics(input: {
  category: string;
  queryTerms: string[];
  includedTypes: string[];
  returnedCount: number;
  filteredOutCount: number;
  scoreMap: Map<string, CategoryScore>;
  rejected: Array<{ place: { id: string; displayName?: { text?: string } }; reason: string }>;
}): void {
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

  console.info(
    JSON.stringify({
      event: "category_intelligence",
      category: input.category,
      queryTerms: input.queryTerms,
      includedTypes: input.includedTypes,
      returnedCount: input.returnedCount,
      filteredOutCount: input.filteredOutCount,
      topScoringReasons,
      rejectedPreview
    })
  );
}

function normalizeAliasPath(pathname: string): string {
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

function parseRequiredNumber(searchParams: URLSearchParams, paramName: string): number {
  const raw = searchParams.get(paramName);
  if (raw === null || raw.trim() === "") {
    throw new GooglePlacesError("invalid_input", `${paramName} query parameter is required`, 400, { field: paramName });
  }

  return Number(raw);
}

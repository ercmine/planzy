import type { IncomingMessage, ServerResponse } from "node:http";

import type { SessionDeckHandler } from "../api/sessions/deckHandler.js";
import { createAccountsHttpHandlers } from "../accounts/http.js";
import { createDiscoveryHttpHandlers } from "../discovery/http.js";
import { createCreatorHttpHandlers } from "../creator/http.js";
import { createCreatorMonetizationHttpHandlers } from "../creatorMonetization/http.js";
import type { AccountsService } from "../accounts/service.js";
import type { CreatorService } from "../creator/service.js";
import type { CreatorMonetizationService } from "../creatorMonetization/service.js";
import type { DiscoveryHttpHandlerDeps } from "../discovery/http.js";
import { PermissionAction, ProfileType } from "../accounts/types.js";
import type { ActorContextResolved } from "../accounts/types.js";
import type { SessionIdeasHandlers } from "../api/sessions/ideasHandler.js";
import { handleMerchantHttpError, createMerchantHttpHandlers } from "../merchant/http.js";
import type { MerchantService } from "../merchant/service.js";
import { ValidationError } from "../plans/errors.js";
import { sanitizeText } from "../sanitize/text.js";
import { createSubscriptionHttpHandlers } from "../subscriptions/http.js";
import type { EntitlementPolicyService } from "../subscriptions/policy.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import { FEATURE_KEYS, FeatureQuotaEngine, QUOTA_KEYS, type PremiumContentDescriptor } from "../subscriptions/accessEngine.js";
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
import type { SavedHttpHandlers } from "../saved/http.js";

const DEFAULT_PUBLIC_API_BASE_URL = "https://api.perbug.com";
const DEFAULT_GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL = "https://places.googleapis.com/v1";

const PREMIUM_CONTENT: Record<string, PremiumContentDescriptor> = {
  "article-free-city-guide": { contentId: "article-free-city-guide", visibility: "free" },
  "article-premium-hidden-gems": { contentId: "article-premium-hidden-gems", visibility: "premium" },
  "creator-growth-playbook": { contentId: "creator-growth-playbook", visibility: "creator_only" },
  "business-ads-template-pack": { contentId: "business-ads-template-pack", visibility: "business_only" }
};

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
    accessEngine?: FeatureQuotaEngine;
    accountsService?: AccountsService;
    creatorService?: CreatorService;
    creatorMonetizationService?: CreatorMonetizationService;
    discovery?: DiscoveryHttpHandlerDeps;
    savedHandlers?: SavedHttpHandlers;
  }
) {
  const handlers = createVenueClaimsHttpHandlers(service);
  const merchantHandlers = createMerchantHttpHandlers(merchantService);
  const telemetryHandlers = deps?.telemetryService ? createTelemetryHttpHandlers(deps.telemetryService) : null;
  const subscriptionHandlers = deps?.subscriptionService && deps?.entitlementPolicy
    ? createSubscriptionHttpHandlers(deps.subscriptionService, deps.entitlementPolicy)
    : null;
  const accountHandlers = deps?.accountsService ? createAccountsHttpHandlers(deps.accountsService) : null;
  const discoveryHandlers = deps?.discovery ? createDiscoveryHttpHandlers(deps.discovery) : null;
  const creatorHandlers = deps?.creatorService ? createCreatorHttpHandlers(deps.creatorService) : null;
  const creatorMonetizationHandlers = deps?.creatorMonetizationService ? createCreatorMonetizationHttpHandlers(deps.creatorMonetizationService) : null;

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

      const cityPageMatch = /^\/v1\/discovery\/cities\/([^/]+)$/.exec(normalizedPath);
      if (discoveryHandlers && req.method === "GET" && cityPageMatch) {
        await discoveryHandlers.cityPage(req, res, decodeURIComponent(cityPageMatch[1] ?? ""));
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
          .map((photo: any, index) => {
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
          .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

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
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const body = await parseJsonBody(req);
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const fileName = String(payload.fileName ?? "upload").trim();
        const mimeType = String(payload.mimeType ?? "").trim().toLowerCase();
        const base64Data = payload.base64Data == null ? undefined : String(payload.base64Data).trim();
        const mediaType = String(payload.mediaType ?? (mimeType.startsWith("video/") ? "video" : "photo")).trim() as "photo" | "video";
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
          const target = { targetId: resolvedTarget.accountId, targetType: resolvedTarget.accountType as never };
          deps.subscriptionService.ensureAccount(target.targetId, target.targetType);

          const canUpload = await deps.accessEngine.checkFeatureAccess(target, mediaType === "video" ? FEATURE_KEYS.UPLOAD_VIDEOS : FEATURE_KEYS.UPLOAD_PHOTOS);
          if (!canUpload.allowed) {
            sendJson(res, 403, { access: canUpload });
            return;
          }
        }

        const upload = await deps.reviewsStore.createMediaUpload({ ownerUserId: userIdHeader, mediaType, fileName, mimeType, base64Data, fileSizeBytes, durationMs, width, height });
        sendJson(res, 201, { upload });
        return;
      }

      const reviewMediaUploadFinalizeMatch = /^\/v1\/reviews\/media\/uploads\/([^/]+)\/finalize$/.exec(normalizedPath);
      if (reviewMediaUploadFinalizeMatch && req.method === "POST" && deps?.reviewsStore) {
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const uploadId = decodeURIComponent(reviewMediaUploadFinalizeMatch[1] ?? "");
        const body = await parseJsonBody(req);
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const upload = await deps.reviewsStore.finalizeMediaUpload({
          uploadId,
          ownerUserId: userIdHeader,
          fileSizeBytes: payload.fileSizeBytes == null ? undefined : Number(payload.fileSizeBytes),
          durationMs: payload.durationMs == null ? undefined : Number(payload.durationMs),
          width: payload.width == null ? undefined : Number(payload.width),
          height: payload.height == null ? undefined : Number(payload.height),
          checksum: payload.checksum == null ? undefined : String(payload.checksum)
        });
        sendJson(res, 200, { upload });
        return;
      }

      const reviewsMatch = /^\/places\/([^/]+)\/reviews$/.exec(normalizedPath);
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
            sort: sort as never,
            cursor,
            limit,
            trustedOnly,
            verifiedOnly
          });
          sendJson(res, 200, result);
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

          const body = await parseJsonBody(req);
          if (!body || typeof body !== "object" || Array.isArray(body)) {
            throw new ValidationError(["body must be a JSON object"], "Invalid review payload");
          }

          const payload = body as Record<string, unknown>;
          const videoPayload = payload.video && typeof payload.video === "object" ? payload.video as Record<string, unknown> : undefined;
          const mediaUploadIds = Array.isArray(payload.mediaUploadIds) ? payload.mediaUploadIds.map((item) => String(item ?? "").trim()).filter(Boolean) : [];

          if (deps?.accessEngine && deps?.subscriptionService) {
            const resolvedTarget = deps?.accountsService
              ? deps.accountsService.resolveSubscriptionTarget(actor)
              : { accountId: userIdHeader, accountType: "USER" };
            const target = { targetId: resolvedTarget.accountId, targetType: resolvedTarget.accountType as never };
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
          } else if (deps?.entitlementPolicy && deps?.subscriptionService) {
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
            editWindowMinutes: Number(process.env.REVIEW_EDIT_WINDOW_MINUTES ?? 30)
          });

          if (deps?.accessEngine && deps?.subscriptionService) {
            const resolvedTarget = deps?.accountsService
              ? deps.accountsService.resolveSubscriptionTarget(actor)
              : { accountId: userIdHeader, accountType: "USER" };
            const target = { targetId: resolvedTarget.accountId, targetType: resolvedTarget.accountType as never };
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
          } else if (subscriptionHandlers) {
            const usageAccountId = deps?.accountsService ? deps.accountsService.resolveSubscriptionTarget(actor).accountId : userId;
            await subscriptionHandlers.recordReviewUsage(usageAccountId);
          }

          sendJson(res, 201, { review: created, created: true });
          return;
        }
      }

      const myReviewMatch = /^\/places\/([^/]+)\/reviews\/me$/.exec(normalizedPath);
      if (myReviewMatch && req.method === "GET" && deps?.reviewsStore) {
        const placeId = decodeURIComponent(myReviewMatch[1] ?? "");
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const review = await deps.reviewsStore.getByPlaceAndAuthor(placeId, userIdHeader);
        sendJson(res, 200, { review });
        return;
      }

      const reviewDetailMatch = /^\/places\/([^/]+)\/reviews\/([^/]+)$/.exec(normalizedPath);
      if (reviewDetailMatch && deps?.reviewsStore) {
        const reviewId = decodeURIComponent(reviewDetailMatch[2] ?? "");
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (req.method === "PATCH") {
          if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
          const body = await parseJsonBody(req);
          const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
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
          sendJson(res, 200, { review: updated });
          return;
        }
        if (req.method === "DELETE") {
          if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
          const deleted = await deps.reviewsStore.softDelete(reviewId, userIdHeader);
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
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const status = String(payload.status ?? "").trim();
        const actorUserId = String(payload.actorUserId ?? "admin").trim();
        const profile = await deps.reviewsStore.applyTrustOverride({
          userId,
          actorUserId,
          status: status as never,
          reason: payload.reason == null ? undefined : String(payload.reason),
          notes: payload.notes == null ? undefined : String(payload.notes)
        });
        sendJson(res, 200, { profile });
        return;
      }

      if (normalizedPath === "/v1/trust/evidence" && req.method === "POST" && deps?.reviewsStore) {
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const body = await parseJsonBody(req);
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const evidence = await deps.reviewsStore.upsertVerificationEvidence({
          userId: payload.userId ? String(payload.userId) : userIdHeader,
          placeId: String(payload.placeId ?? ""),
          linkedReviewId: payload.linkedReviewId == null ? undefined : String(payload.linkedReviewId),
          evidenceType: String(payload.evidenceType ?? "behavioral_heuristic") as never,
          evidenceStrength: Number(payload.evidenceStrength ?? payload.confidenceScore ?? 10),
          confidenceScore: payload.confidenceScore == null ? undefined : Number(payload.confidenceScore),
          sourceType: payload.sourceType == null ? undefined : String(payload.sourceType) as never,
          sourceId: payload.sourceId == null ? undefined : String(payload.sourceId),
          evidenceStatus: payload.evidenceStatus == null ? undefined : String(payload.evidenceStatus) as never,
          strengthLevel: payload.strengthLevel == null ? undefined : String(payload.strengthLevel) as never,
          observedAt: payload.observedAt == null ? undefined : String(payload.observedAt),
          startsAt: payload.startsAt == null ? undefined : String(payload.startsAt),
          endsAt: payload.endsAt == null ? undefined : String(payload.endsAt),
          expiresAt: payload.expiresAt == null ? undefined : String(payload.expiresAt),
          privacyClass: payload.privacyClass == null ? undefined : String(payload.privacyClass) as never,
          metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : undefined
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
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const actorUserId = String(payload.actorUserId ?? "admin").trim();
        const status = String(payload.status ?? "").trim();
        const summary = await deps.reviewsStore.applyReviewVerificationOverride({
          reviewId,
          actorUserId,
          status: status as never,
          reason: payload.reason == null ? undefined : String(payload.reason)
        });
        sendJson(res, 200, { summary });
        return;
      }

      if (normalizedPath === "/v1/trust/evidence/eligible" && req.method === "GET" && deps?.reviewsStore) {
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const placeId = String(url.searchParams.get("placeId") ?? "").trim();
        if (!placeId) throw new ValidationError(["placeId is required"]);
        const reviewId = String(url.searchParams.get("reviewId") ?? "").trim() || undefined;
        const evidence = await deps.reviewsStore.listEligibleEvidenceForUser({ userId: userIdHeader, placeId, reviewId });
        sendJson(res, 200, { evidence });
        return;
      }

      if (normalizedPath === "/v1/trust/visit-sessions" && req.method === "POST" && deps?.reviewsStore) {
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const body = await parseJsonBody(req);
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const session = await deps.reviewsStore.createVisitSession({
          userId: userIdHeader,
          placeId: payload.placeId == null ? undefined : String(payload.placeId),
          startedAt: String(payload.startedAt ?? new Date().toISOString()),
          endedAt: payload.endedAt == null ? undefined : String(payload.endedAt),
          confidenceScore: Number(payload.confidenceScore ?? 50),
          sourceType: String(payload.sourceType ?? "gps") as never,
          sessionStatus: payload.sessionStatus == null ? undefined : String(payload.sessionStatus) as never,
          metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : undefined
        });
        sendJson(res, 201, { session });
        return;
      }
      const helpfulMatch = /^\/reviews\/([^/]+)\/helpful$/.exec(normalizedPath);
      if (helpfulMatch && deps?.reviewsStore) {
        const reviewId = decodeURIComponent(helpfulMatch[1] ?? "");
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        if (req.method === "POST") {
          const review = await deps.reviewsStore.voteHelpful(reviewId, userIdHeader);
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
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const body = await parseJsonBody(req);
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const reason = String(payload.reason ?? "").trim() || "unspecified";
        await deps.reviewsStore.reportReview(reviewId, userIdHeader, reason);
        sendJson(res, 202, { ok: true });
        return;
      }

      const mediaReportMatch = /^\/reviews\/media\/([^/]+)\/report$/.exec(normalizedPath);
      if (mediaReportMatch && req.method === "POST" && deps?.reviewsStore) {
        const mediaId = decodeURIComponent(mediaReportMatch[1] ?? "");
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader) throw new ValidationError(["x-user-id header is required"]);
        const body = await parseJsonBody(req);
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const reason = String(payload.reason ?? "").trim() || "unspecified";
        await deps.reviewsStore.reportReviewMedia(mediaId, userIdHeader, reason);
        sendJson(res, 202, { ok: true });
        return;
      }

      const businessResponseMatch = /^\/v1\/reviews\/([^/]+)\/business-response$/.exec(normalizedPath);
      if (businessResponseMatch && req.method === "POST" && deps?.reviewsStore) {
        const reviewId = decodeURIComponent(businessResponseMatch[1] ?? "");
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader || !deps.accountsService) throw new ValidationError(["x-user-id header is required"]);
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
        if (!review) throw new ValidationError(["review not found"]);
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
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const clean = sanitizeText(payload.content ?? payload.body, {
          source: "user",
          maxLen: 1200,
          allowNewlines: true,
          profanityMode: "mask",
          stripHtml: true
        });
        if (!clean || clean.length < 2) throw new ValidationError(["content length must be between 2 and 1200"]);

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
        sendJson(res, 201, { response });
        return;
      }

      const businessResponseDetailMatch = /^\/v1\/reviews\/([^/]+)\/business-response\/([^/]+)$/.exec(normalizedPath);
      if (businessResponseDetailMatch && deps?.reviewsStore) {
        const reviewId = decodeURIComponent(businessResponseDetailMatch[1] ?? "");
        const responseId = decodeURIComponent(businessResponseDetailMatch[2] ?? "");
        const userIdHeader = String(readHeader(req, "x-user-id") ?? "").trim();
        if (!userIdHeader || !deps.accountsService) throw new ValidationError(["x-user-id header is required"]);

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
          if (!review) throw new ValidationError(["review not found"]);
          const ownership = await service.getActiveOwnershipForBusinessActor({ placeId: review.placeId, businessProfileId: actor.profileId, userId: actor.userId });
          const body = await parseJsonBody(req);
          const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
          const clean = sanitizeText(payload.content ?? payload.body, { source: "user", maxLen: 1200, allowNewlines: true, profanityMode: "mask", stripHtml: true });
          if (!clean || clean.length < 2) throw new ValidationError(["content length must be between 2 and 1200"]);
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
          if (response.id !== responseId) throw new ValidationError(["business response id mismatch"]);
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
        const statuses = statusesRaw ? statusesRaw.split(",").map((item) => item.trim()).filter(Boolean) as never[] : undefined;
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
        const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
        const action = String(payload.action ?? "").trim();
        const response = await deps.reviewsStore.moderateBusinessReviewResponse({
          responseId,
          action: action as never,
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
        if (!userIdHeader || !deps.accountsService) throw new ValidationError(["x-user-id header is required"]);
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
        if (!userId) throw new ValidationError(["x-user-id header is required"]);
        const accountType = deps?.accountsService
          ? deps.accountsService.resolveSubscriptionTarget({ userId, profileType: ProfileType.PERSONAL, profileId: userId, roles: [] }).accountType as never
          : "USER" as never;
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
        if (!userId) throw new ValidationError(["x-user-id header is required"]);
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
        if (!userId) throw new ValidationError(["x-user-id header is required"]);
        const target = { targetType: SubscriptionTargetType.USER, targetId: userId };
        const features = await deps.accessEngine.getFeatureAccessSummary(target);
        const quotas = await deps.accessEngine.getQuotaSummary(target);
        sendJson(res, 200, { features, quotas });
        return;
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
          if (!assertAdmin(req)) return sendJson(res, 403, { error: "forbidden" });
          await creatorMonetizationHandlers.adminStatus(req, res, decodeURIComponent(adminMonetizationMatch[1] ?? ""));
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

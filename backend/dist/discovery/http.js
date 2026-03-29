import { readHeader, sendJson } from "../venues/claims/http.js";
import { QueryNormalizationService } from "./queryNormalization.js";
export function createDiscoveryHttpHandlers(deps) {
    const normalizer = new QueryNormalizationService();
    function handleSearchError(res, error) {
        const code = error instanceof Error ? error.message : "internal_search_failure";
        if (["invalid_lat", "invalid_lng", "invalid_radius", "nearby_requires_coordinates", "text_search_requires_q", "category_search_requires_category"].includes(code)) {
            sendJson(res, 400, { error: code });
            return;
        }
        sendJson(res, 500, { error: "internal_search_failure" });
    }
    function requestContext(req) {
        const base = `http://${req.headers.host ?? "localhost"}`;
        const url = new URL(req.url ?? "/", base);
        return { url, context: normalizer.normalize(url.searchParams) };
    }
    return {
        async search(req, res) {
            const { context } = requestContext(req);
            let payload;
            try {
                payload = await deps.searchService.search(context);
            }
            catch (error) {
                handleSearchError(res, error);
                return;
            }
            await deps.analyticsService?.track({ eventName: "search_submitted", metadata: { hasQuery: Boolean(context.query) } }, { actorUserId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, sourceRoute: "/v1/discovery/search", cityName: context.city, categoryName: context.categorySlug, platform: "backend" });
            await deps.analyticsService?.track({ eventName: "search_results_viewed", metadata: { total: payload.items.length, zeroResults: payload.items.length === 0 } }, { actorUserId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, sourceRoute: "/v1/discovery/search", cityName: context.city, categoryName: context.categorySlug, platform: "backend" });
            sendJson(res, 200, payload);
        },
        async browse(req, res) {
            const { context } = requestContext(req);
            let payload;
            try {
                payload = await deps.browseService.browse(context);
            }
            catch (error) {
                handleSearchError(res, error);
                return;
            }
            await deps.analyticsService?.track({ eventName: "category_page_viewed", metadata: { total: payload.items.length } }, { actorUserId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, categoryName: context.categorySlug, sourceRoute: "/v1/discovery/browse", platform: "backend" });
            sendJson(res, 200, payload);
        },
        async cityPage(req, res, citySlug) {
            const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
            const cityName = citySlug.replace(/-/g, " ");
            const payload = await deps.cityPageService.getCityPage(userId, cityName);
            await deps.analyticsService?.track({ eventName: "city_page_viewed", metadata: { trending: payload.sections.filter((section) => section.type === "trending").reduce((sum, section) => sum + section.items.length, 0), recommendations: payload.sections.filter((section) => section.type === "recommended").reduce((sum, section) => sum + section.items.length, 0) } }, { actorUserId: userId, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, cityName, sourceRoute: "/v1/discovery/cities", platform: "backend" });
            sendJson(res, 200, payload);
        },
        async nearby(req, res) {
            const { context } = requestContext(req);
            let payload;
            try {
                payload = await deps.nearbyService.nearby(context);
            }
            catch (error) {
                handleSearchError(res, error);
                return;
            }
            await deps.analyticsService?.track({ eventName: "nearby_results_viewed", metadata: { total: payload.items.length } }, { actorUserId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, cityName: context.city, sourceRoute: "/v1/discovery/nearby", platform: "backend" });
            sendJson(res, 200, payload);
        },
        async trending(req, res) {
            const { context } = requestContext(req);
            const payload = await deps.trendingService.list(context);
            await deps.analyticsService?.track({ eventName: "trending_place_viewed", metadata: { total: payload.items.length } }, { actorUserId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, cityName: context.city, sourceRoute: "/v1/discovery/trending", platform: "backend" });
            sendJson(res, 200, payload);
        },
        async recommendations(req, res) {
            const { context } = requestContext(req);
            const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
            const payload = await deps.recommendationService.getPersonalizedRecommendations(userId, context);
            await deps.analyticsService?.track({ eventName: "recommendation_impression", metadata: { total: payload.items.length } }, { actorUserId: userId, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, sourceRoute: "/v1/discovery/recommendations", cityName: context.city, platform: "backend" });
            sendJson(res, 200, payload);
        },
        async relatedPlaces(req, res, placeId) {
            const { context } = requestContext(req);
            const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
            const payload = await deps.recommendationService.getRelatedPlacesForPlace(userId, placeId, context);
            await deps.analyticsService?.track({ eventName: "recommendation_opened", placeId, metadata: { total: payload.items.length } }, { actorUserId: userId, sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined, sourceRoute: "/v1/discovery/places/:id/related", platform: "backend" });
            sendJson(res, 200, payload);
        },
        async suggestedCreators(req, res) {
            const { context } = requestContext(req);
            const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
            sendJson(res, 200, await deps.recommendationService.getSuggestedCreators(userId, context));
        },
        async suggestedGuides(req, res) {
            const { context } = requestContext(req);
            const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
            sendJson(res, 200, await deps.recommendationService.getSuggestedGuides(userId, context));
        },
        async feed(req, res) {
            const { context, url } = requestContext(req);
            const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
            const mode = (url.searchParams.get("mode") ?? "for_you");
            sendJson(res, 200, await deps.feedService.feed(userId, mode, context));
        },
        async premiumExperienceState(req, res) {
            const userId = String(readHeader(req, "x-user-id") ?? "").trim();
            if (!userId) {
                sendJson(res, 401, { error: "x-user-id header required" });
                return;
            }
            sendJson(res, 200, { state: deps.premiumExperience.getPremiumExperienceState(userId) });
        },
        async premiumDiscoveryModules(req, res) {
            const userId = String(readHeader(req, "x-user-id") ?? "").trim();
            if (!userId) {
                sendJson(res, 200, { modules: [] });
                return;
            }
            sendJson(res, 200, { modules: deps.premiumExperience.getPremiumDiscoveryModules(userId) });
        }
    };
}

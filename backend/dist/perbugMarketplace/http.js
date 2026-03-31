import { sendJson } from "../venues/claims/http.js";
function toNumber(value) {
    if (!value)
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
export function createPerbugMarketplaceHttpHandlers(service) {
    return {
        listListings: async (req, res) => {
            const base = `http://${req.headers.host ?? "localhost"}`;
            const url = new URL(req.url ?? "/", base);
            const filters = {
                category: (url.searchParams.get("category") ?? undefined),
                status: (url.searchParams.get("status") ?? undefined),
                rarity: (url.searchParams.get("rarity") ?? undefined),
                provenanceTag: (url.searchParams.get("provenance") ?? undefined),
                minPrice: toNumber(url.searchParams.get("minPrice")),
                maxPrice: toNumber(url.searchParams.get("maxPrice")),
                search: url.searchParams.get("q") ?? undefined,
            };
            const sort = (url.searchParams.get("sort") ?? "featured");
            sendJson(res, 200, service.listListings({ filters, sort }));
        },
        getListingDetail: async (_req, res, listingId) => {
            const detail = service.getListingDetail(listingId);
            if (!detail) {
                sendJson(res, 404, { error: "listing_not_found" });
                return;
            }
            sendJson(res, 200, detail);
        },
        featuredListings: async (_req, res) => {
            sendJson(res, 200, { items: service.featuredListings() });
        },
        listByCategory: async (_req, res, category) => {
            sendJson(res, 200, service.listListings({ filters: { category } }));
        },
        search: async (req, res) => {
            const base = `http://${req.headers.host ?? "localhost"}`;
            const url = new URL(req.url ?? "/", base);
            const q = url.searchParams.get("q") ?? "";
            sendJson(res, 200, service.listListings({ filters: { search: q } }));
        },
        categories: async (_req, res) => {
            sendJson(res, 200, { categories: service.categories() });
        },
        analytics: async (_req, res) => {
            sendJson(res, 200, service.analyticsSnapshot());
        },
        capabilities: async (_req, res) => {
            sendJson(res, 200, {
                createListingDraft: "planned",
                cancelListing: "planned",
                purchaseListing: "planned",
                sellerEligibleInventory: "planned",
                settlementBoundary: "separate_transaction_domain",
            });
        },
    };
}

function parsePrice(listing) {
    return Number(listing.price.amount);
}
function matchesSearch(listing, search) {
    const q = search.trim().toLowerCase();
    if (!q)
        return true;
    const haystack = [
        listing.assetName,
        listing.metadata.summary,
        listing.metadata.roleClass,
        listing.metadata.relicType,
        listing.metadata.itemType,
        listing.metadata.mapLink?.regionName,
        listing.metadata.mapLink?.landmarkName,
        listing.provenance.originLabel,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
}
export class PerbugMarketplaceService {
    listings;
    listingViews = 0;
    detailOpens = 0;
    categoryPopularity = {};
    filterUsage = {};
    constructor(listings) {
        this.listings = listings;
    }
    listListings(input = {}) {
        const started = Date.now();
        const filters = input.filters ?? {};
        const sort = input.sort ?? "featured";
        this.listingViews += 1;
        const filtered = this.listings.filter((listing) => {
            if (filters.status && listing.status !== filters.status)
                return false;
            if (!filters.status && listing.status !== "active")
                return false;
            if (filters.category && listing.assetType !== filters.category)
                return false;
            if (filters.rarity && listing.rarity !== filters.rarity)
                return false;
            if (filters.provenanceTag && !listing.provenance.tags.includes(filters.provenanceTag))
                return false;
            if (typeof filters.minPrice === "number" && parsePrice(listing) < filters.minPrice)
                return false;
            if (typeof filters.maxPrice === "number" && parsePrice(listing) > filters.maxPrice)
                return false;
            if (filters.search && !matchesSearch(listing, filters.search))
                return false;
            return true;
        });
        const sorted = [...filtered].sort((a, b) => {
            switch (sort) {
                case "price_asc":
                    return parsePrice(a) - parsePrice(b);
                case "price_desc":
                    return parsePrice(b) - parsePrice(a);
                case "newest":
                    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
                case "ending_soon":
                    return Date.parse(a.expiresAt ?? "9999-01-01") - Date.parse(b.expiresAt ?? "9999-01-01");
                case "rarity_desc": {
                    const order = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
                    return order[b.rarity] - order[a.rarity];
                }
                case "featured":
                default:
                    return (a.featuredRank ?? 999) - (b.featuredRank ?? 999);
            }
        });
        const facets = {
            byType: { character: 0, item: 0, relic: 0, cosmetic: 0, map_asset: 0, special_event_asset: 0, nft_backed_asset: 0 },
            byRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 },
            byProvenance: {},
        };
        for (const listing of filtered) {
            facets.byType[listing.assetType] += 1;
            facets.byRarity[listing.rarity] += 1;
            for (const tag of listing.provenance.tags) {
                facets.byProvenance[tag] = (facets.byProvenance[tag] ?? 0) + 1;
            }
            this.categoryPopularity[listing.assetType] = (this.categoryPopularity[listing.assetType] ?? 0) + 1;
        }
        const filterFlags = Object.entries(filters).filter(([, v]) => v !== undefined && v !== "").map(([k]) => k);
        for (const key of filterFlags)
            this.filterUsage[key] = (this.filterUsage[key] ?? 0) + 1;
        return {
            items: sorted,
            total: sorted.length,
            facets,
            diagnostics: {
                queryMs: Date.now() - started,
                filtersApplied: filterFlags,
            },
        };
    }
    getListingDetail(listingId) {
        const listing = this.listings.find((entry) => entry.listingId === listingId);
        if (!listing)
            return undefined;
        this.detailOpens += 1;
        return {
            listing,
            lore: `${listing.assetName} is a ${listing.rarity} ${listing.assetType.replace("_", " ")} tied to ${listing.provenance.originLabel}.`,
            ownershipPath: [
                { ownerId: listing.seller.sellerId, at: listing.createdAt, source: listing.assetReference.sourceModule },
            ],
            debug: {
                projectedFromModules: [listing.assetReference.sourceModule, "provenance", "economy_pricing"],
                schemaVersion: "marketplace.v1",
            },
        };
    }
    featuredListings() {
        return this.listListings({ sort: "featured" }).items.slice(0, 4);
    }
    categories() {
        return ["character", "item", "relic", "map_asset", "cosmetic", "special_event_asset", "nft_backed_asset"];
    }
    analyticsSnapshot() {
        const rarityDistribution = {};
        const provenanceDistribution = {};
        const avgPriceRaw = {};
        let mapLinkedListingCount = 0;
        for (const listing of this.listings) {
            rarityDistribution[listing.rarity] = (rarityDistribution[listing.rarity] ?? 0) + 1;
            for (const tag of listing.provenance.tags)
                provenanceDistribution[tag] = (provenanceDistribution[tag] ?? 0) + 1;
            if (listing.metadata.mapLink)
                mapLinkedListingCount += 1;
            const key = listing.price.currency.code;
            avgPriceRaw[key] = avgPriceRaw[key] ?? { sum: 0, count: 0 };
            avgPriceRaw[key].sum += parsePrice(listing);
            avgPriceRaw[key].count += 1;
        }
        const averagePriceByCurrency = Object.fromEntries(Object.entries(avgPriceRaw).map(([key, value]) => [key, Number((value.sum / value.count).toFixed(2))]));
        return {
            listingViews: this.listingViews,
            detailOpens: this.detailOpens,
            categoryPopularity: this.categoryPopularity,
            filterUsage: this.filterUsage,
            rarityDistribution,
            provenanceDistribution,
            mapLinkedListingCount,
            averagePriceByCurrency,
        };
    }
}

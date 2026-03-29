class ExpiringCache {
    data = new Map();
    get(key, now) {
        const entry = this.data.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt <= now) {
            this.data.delete(key);
            return undefined;
        }
        return entry;
    }
    set(key, entry) {
        this.data.set(key, entry);
    }
}
function encodeContinuation(state) {
    return Buffer.from(JSON.stringify(state), "utf8").toString("base64");
}
function decodeContinuation(value) {
    if (!value) {
        return undefined;
    }
    try {
        return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    }
    catch {
        return undefined;
    }
}
function fingerprint(context, provider) {
    return JSON.stringify({ provider, ...context, paginationToken: undefined });
}
function inferFailureReason(error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("timeout")) {
        return "provider_timeout";
    }
    if (message.includes("rate")) {
        return "provider_rate_limited";
    }
    return "provider_error";
}
function shouldEnrich(place, level) {
    if (level === "minimal") {
        return false;
    }
    const sparse = !place.longDescription || place.photoGallery.length < 2 || Object.keys(place.normalizedHours).length === 0;
    return sparse || level === "premium";
}
export class MultiSourcePlaceIngestionService {
    normalizationService;
    providers;
    config;
    now;
    searchCache = new ExpiringCache();
    detailCache = new ExpiringCache();
    canonicalCache = new ExpiringCache();
    failureCache = new ExpiringCache();
    constructor(normalizationService, providers, config, now = () => Date.now()) {
        this.normalizationService = normalizationService;
        this.providers = providers;
        this.config = config;
        this.now = now;
    }
    async searchCanonicalPlaces(context) {
        const continuation = decodeContinuation(context.paginationToken);
        const effectiveContext = continuation?.originalContext ?? context;
        const providerOrder = this.pickProviders(effectiveContext.intent, context.sourcePreferences);
        const seenIds = new Set(continuation?.seenCanonicalPlaceIds ?? []);
        const providerTokens = new Map(continuation?.providers.map((item) => [item.provider, item.nextPageToken]) ?? []);
        const fallbackReasons = [];
        const partialFailures = [];
        const providersUsed = [];
        const candidates = [];
        let cacheHits = 0;
        let cacheMisses = 0;
        let expensiveCalls = 0;
        for (const providerName of providerOrder) {
            if (candidates.length >= effectiveContext.resultLimit) {
                break;
            }
            const client = this.providers.get(providerName);
            if (!client || !client.metadata.enabled) {
                continue;
            }
            if (client.metadata.costTier === "high" && expensiveCalls >= this.config.maxExpensiveProviderCallsPerRequest) {
                continue;
            }
            const failureKey = `fail:${providerName}`;
            if (this.failureCache.get(failureKey, this.now())) {
                continue;
            }
            const req = {
                context: effectiveContext,
                limit: effectiveContext.resultLimit,
                pageToken: providerTokens.get(providerName)
            };
            const cacheKey = `search:${fingerprint(effectiveContext, providerName)}:${req.pageToken ?? ""}`;
            const cacheEntry = this.searchCache.get(cacheKey, this.now());
            let response;
            if (cacheEntry) {
                cacheHits += 1;
                response = cacheEntry.value;
            }
            else {
                cacheMisses += 1;
                try {
                    const operation = effectiveContext.intent === "nearby" && client.nearbyPlaces
                        ? client.nearbyPlaces.bind(client)
                        : effectiveContext.intent === "category_search" && client.categoryPlaces
                            ? client.categoryPlaces.bind(client)
                            : client.searchPlaces.bind(client);
                    response = await operation(req);
                    this.searchCache.set(cacheKey, {
                        value: response,
                        provider: providerName,
                        fetchedAt: this.now(),
                        expiresAt: this.now() + this.config.ttl.searchMs,
                        queryFingerprint: fingerprint(effectiveContext, providerName),
                        locale: effectiveContext.locale,
                        status: response.records.length > 0 ? "ok" : "empty"
                    });
                }
                catch (error) {
                    const reason = inferFailureReason(error);
                    fallbackReasons.push(reason);
                    partialFailures.push({ provider: providerName, reason, message: error instanceof Error ? error.message : String(error) });
                    this.failureCache.set(failureKey, {
                        value: { failed: true },
                        provider: providerName,
                        fetchedAt: this.now(),
                        expiresAt: this.now() + this.config.ttl.failureMs,
                        queryFingerprint: providerName,
                        status: "error"
                    });
                    continue;
                }
            }
            providersUsed.push(providerName);
            if (client.metadata.costTier === "high") {
                expensiveCalls += 1;
            }
            for (const record of response.records) {
                const imported = this.normalizationService.importProviderPlace({
                    provider: record.provider,
                    rawPayload: record.rawPayload,
                    sourceUrl: record.sourceUrl
                });
                const canonical = this.normalizationService.getCanonicalPlace(imported.canonicalPlaceId);
                if (!canonical || seenIds.has(canonical.canonicalPlaceId)) {
                    continue;
                }
                candidates.push(canonical);
                seenIds.add(canonical.canonicalPlaceId);
            }
            providerTokens.set(providerName, response.nextPageToken);
            const minResults = this.config.fallbackMinResultsByIntent[effectiveContext.intent] ?? effectiveContext.resultLimit;
            if (candidates.length >= minResults) {
                break;
            }
            fallbackReasons.push("insufficient_results");
        }
        const canonicalPlaces = candidates.slice(0, effectiveContext.resultLimit);
        const continuationToken = encodeContinuation({
            providers: providerOrder.map((provider) => ({ provider, nextPageToken: providerTokens.get(provider) })),
            seenCanonicalPlaceIds: [...seenIds],
            originalContext: effectiveContext
        });
        return {
            canonicalPlaces,
            continuationToken,
            providersUsed,
            fallbackUsed: fallbackReasons.length > 0,
            fallbackReasons,
            cacheStats: { hits: cacheHits, misses: cacheMisses },
            enrichmentStatus: "none",
            partialFailures
        };
    }
    async getCanonicalPlaceDetails(input) {
        let canonical = input.canonicalPlaceId ? this.normalizationService.getCanonicalPlace(input.canonicalPlaceId) : undefined;
        if (!canonical && input.providerRef) {
            canonical = this.normalizationService.getCanonicalPlaceByProviderRef(input.providerRef.provider, input.providerRef.providerPlaceId);
        }
        if (!canonical && !input.providerRef) {
            return {
                canonicalPlaces: [],
                providersUsed: [],
                fallbackUsed: false,
                fallbackReasons: [],
                cacheStats: { hits: 0, misses: 0 },
                enrichmentStatus: "none",
                partialFailures: []
            };
        }
        const level = input.context.detailEnrichmentLevel ?? "standard";
        const fallbackReasons = [];
        const providersUsed = [];
        const partialFailures = [];
        if (canonical) {
            const cached = this.canonicalCache.get(`canonical:${canonical.canonicalPlaceId}`, this.now());
            if (cached && !shouldEnrich(cached.value, level)) {
                return {
                    canonicalPlaces: [cached.value],
                    providersUsed: [],
                    fallbackUsed: false,
                    fallbackReasons: [],
                    cacheStats: { hits: 1, misses: 0 },
                    enrichmentStatus: "none",
                    partialFailures: []
                };
            }
        }
        const sourceLinks = canonical?.sourceLinks ?? (input.providerRef ? [{ ...input.providerRef, sourceRecordId: "", lastSeenAt: "" }] : []);
        let enrichmentCalls = 0;
        for (const link of sourceLinks) {
            if (enrichmentCalls >= this.config.maxEnrichmentCallsPerRequest) {
                break;
            }
            const provider = this.providers.get(link.provider);
            if (!provider?.metadata.enabled) {
                continue;
            }
            const detailKey = `detail:${link.provider}:${link.providerPlaceId}`;
            const detailCache = this.detailCache.get(detailKey, this.now());
            let detailRecord;
            if (detailCache) {
                detailRecord = detailCache.value;
            }
            else {
                try {
                    detailRecord = await provider.getPlaceDetails({ providerPlaceId: link.providerPlaceId, context: input.context });
                    if (detailRecord) {
                        this.detailCache.set(detailKey, {
                            value: detailRecord,
                            provider: link.provider,
                            fetchedAt: this.now(),
                            expiresAt: this.now() + this.config.ttl.detailMs,
                            queryFingerprint: detailKey,
                            status: "ok"
                        });
                    }
                    providersUsed.push(link.provider);
                    enrichmentCalls += 1;
                }
                catch (error) {
                    const reason = inferFailureReason(error);
                    fallbackReasons.push(reason);
                    partialFailures.push({ provider: link.provider, reason, message: error instanceof Error ? error.message : String(error) });
                    continue;
                }
            }
            if (detailRecord) {
                const imported = this.normalizationService.importProviderPlace({
                    provider: detailRecord.provider,
                    rawPayload: detailRecord.rawPayload,
                    sourceUrl: detailRecord.sourceUrl
                });
                canonical = this.normalizationService.getCanonicalPlace(imported.canonicalPlaceId) ?? canonical;
            }
        }
        if (canonical && shouldEnrich(canonical, level)) {
            fallbackReasons.push("enrichment_needed");
        }
        if (canonical) {
            this.canonicalCache.set(`canonical:${canonical.canonicalPlaceId}`, {
                value: canonical,
                provider: "canonical",
                fetchedAt: this.now(),
                expiresAt: this.now() + this.config.ttl.canonicalMs,
                queryFingerprint: canonical.canonicalPlaceId,
                status: "ok"
            });
        }
        return {
            canonicalPlaces: canonical ? [canonical] : [],
            providersUsed,
            fallbackUsed: fallbackReasons.length > 0,
            fallbackReasons,
            cacheStats: { hits: 0, misses: 0 },
            enrichmentStatus: providersUsed.length > 0 ? "partial" : "none",
            partialFailures
        };
    }
    nearbyPlaces(context) {
        return this.searchCanonicalPlaces({ ...context, intent: "nearby" });
    }
    categoryPlaces(context) {
        return this.searchCanonicalPlaces({ ...context, intent: "category_search" });
    }
    async hydrateCanonicalPlace(canonicalPlaceId, context) {
        const result = await this.getCanonicalPlaceDetails({ canonicalPlaceId, context: { ...context, intent: "hydrate" } });
        return result.canonicalPlaces[0];
    }
    async syncProviderRecord(providerName, providerPlaceId, context) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            return undefined;
        }
        const detail = await provider.getPlaceDetails({ providerPlaceId, context });
        if (!detail) {
            return undefined;
        }
        const imported = this.normalizationService.importProviderPlace({ provider: detail.provider, rawPayload: detail.rawPayload, sourceUrl: detail.sourceUrl });
        return this.normalizationService.getCanonicalPlace(imported.canonicalPlaceId);
    }
    getNextPlacePage(continuationToken) {
        const continuation = decodeContinuation(continuationToken);
        if (!continuation) {
            return Promise.resolve({
                canonicalPlaces: [],
                providersUsed: [],
                fallbackUsed: false,
                fallbackReasons: [],
                cacheStats: { hits: 0, misses: 0 },
                enrichmentStatus: "none",
                partialFailures: []
            });
        }
        return this.searchCanonicalPlaces({ ...continuation.originalContext, paginationToken: continuationToken, intent: "next_page" });
    }
    pickProviders(intent, preferred) {
        const fromIntent = this.config.priorities[intent] ?? [];
        const merged = preferred && preferred.length > 0 ? [...preferred, ...fromIntent] : [...fromIntent];
        return [...new Set(merged)].filter((name) => this.providers.has(name));
    }
}

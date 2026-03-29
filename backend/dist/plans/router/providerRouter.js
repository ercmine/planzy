import { wrapPlanLinks } from "../../affiliate/wrap.js";
import { defaultLogger } from "../../logging/logger.js";
import { coarseGeo, hashString } from "../../logging/redact.js";
import { ProviderError, RateLimitError, TimeoutError } from "../errors.js";
import { isAbortError } from "../provider.js";
import { validatePlanArray } from "../planValidation.js";
import { PlanSearchCache } from "../cache/planSearchCache.js";
import { validateSearchPlansInput } from "../validation.js";
import { applyNeverEmptyFallback } from "./fallback.js";
import { dedupePlans } from "./dedupe.js";
import { rankPlansAdvanced } from "./ranking.js";
import { applyColdStartBooster } from "./coldStartBooster.js";
import { applySponsoredPlacement } from "./sponsored/sponsoredPlacement.js";
import { DeckBatcher } from "./pagination/deckBatcher.js";
import { QuotaManager } from "./quotas/quotaManager.js";
import { ProviderHealthMonitor } from "./health/healthMonitor.js";
import { NoScrapePolicy, PolicyViolationError, defaultNoScrapePolicy } from "../../policy/noScrapePolicy.js";
const DEFAULT_TIMEOUT_MS = 2_500;
const MAX_PROVIDER_QUEUE = 100;
class ProviderSemaphore {
    maxConcurrent;
    active = 0;
    queue = [];
    constructor(maxConcurrent) {
        this.maxConcurrent = maxConcurrent;
    }
    async acquire() {
        if (!Number.isFinite(this.maxConcurrent) || this.maxConcurrent <= 0) {
            return () => undefined;
        }
        if (this.active < this.maxConcurrent) {
            this.active += 1;
            return () => this.release();
        }
        if (this.queue.length >= MAX_PROVIDER_QUEUE) {
            throw new ProviderError({
                provider: "unknown",
                code: "BUDGET_EXCEEDED",
                message: "Provider request queue limit exceeded",
                retryable: true
            });
        }
        return await new Promise((resolve) => {
            this.queue.push(() => {
                this.active += 1;
                resolve(() => this.release());
            });
        });
    }
    release() {
        this.active = Math.max(0, this.active - 1);
        const next = this.queue.shift();
        next?.();
    }
}
function asProviderError(provider, error) {
    if (error instanceof ProviderError) {
        return error;
    }
    if (isAbortError(error)) {
        return new TimeoutError(provider, "Provider request aborted", error);
    }
    return new ProviderError({
        provider,
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unknown provider error",
        retryable: false,
        cause: error
    });
}
function createCombinedController(signal, timeoutMs) {
    const controller = new AbortController();
    let timeoutTriggered = false;
    const onAbort = () => {
        controller.abort(signal?.reason);
    };
    if (signal) {
        if (signal.aborted) {
            controller.abort(signal.reason);
        }
        else {
            signal.addEventListener("abort", onAbort, { once: true });
        }
    }
    const timeoutId = setTimeout(() => {
        timeoutTriggered = true;
        controller.abort(new DOMException("Provider call timed out", "AbortError"));
    }, timeoutMs);
    return {
        controller,
        cleanup: () => {
            clearTimeout(timeoutId);
            signal?.removeEventListener("abort", onAbort);
        },
        didTimeout: () => timeoutTriggered
    };
}
function getPrimaryCategory(input) {
    return input.categories?.[0];
}
function getSessionHint(sessionId) {
    if (!sessionId) {
        return undefined;
    }
    return hashString(sessionId);
}
function getGeoCell(input) {
    const { location } = input;
    if (!location) {
        return undefined;
    }
    return coarseGeo(location.lat, location.lng);
}
function formatRetryAfterMs(retryAfterMs) {
    if (retryAfterMs === undefined || !Number.isFinite(retryAfterMs)) {
        return "Retry later.";
    }
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return `Retry after ${seconds}s.`;
}
function applyAffiliateWrapping(plans, affiliate, sessionId) {
    if (!affiliate?.enabled) {
        return plans;
    }
    return plans.map((plan) => wrapPlanLinks(plan, affiliate, { sessionId }));
}
export class ProviderRouter {
    providers;
    defaultTimeoutMs;
    perProviderTimeoutMs;
    maxFanout;
    allowPartial;
    includeDebug;
    config;
    semaphores = new Map();
    neverEmpty;
    deckBatcher;
    planSearchCache;
    optionsCacheTtlMs;
    quotaManager;
    enforceQuotas;
    gracefulOnQuota;
    healthMonitor;
    enforceHealth;
    sponsoredPlacement;
    noScrapePolicy;
    enforceNoScrape;
    constructor(opts) {
        this.providers = opts.providers;
        this.config = opts.config;
        this.defaultTimeoutMs = this.config?.plans.router.defaultTimeoutMs ?? opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
        const timeoutOverrides = { ...(opts.perProviderTimeoutMs ?? {}) };
        for (const provider of this.providers) {
            const timeout = this.config?.plans.providers[provider.name]?.budget?.timeoutMs;
            if (timeout !== undefined) {
                timeoutOverrides[provider.name] = timeout;
            }
        }
        this.perProviderTimeoutMs = timeoutOverrides;
        this.maxFanout = opts.maxFanout ?? this.config?.plans.router.maxFanout;
        this.allowPartial = opts.allowPartial ?? this.config?.plans.router.allowPartial ?? true;
        this.includeDebug = opts.includeDebug ?? false;
        this.enforceQuotas = opts.enforceQuotas ?? true;
        this.gracefulOnQuota = opts.gracefulOnQuota ?? true;
        this.quotaManager = opts.quotaManager ?? new QuotaManager();
        this.healthMonitor = opts.healthMonitor ?? new ProviderHealthMonitor();
        this.enforceHealth = opts.enforceHealth ?? true;
        this.neverEmpty = opts.neverEmpty ?? {};
        this.sponsoredPlacement = opts.sponsoredPlacement;
        this.enforceNoScrape = opts.enforceNoScrape ?? true;
        this.noScrapePolicy = opts.noScrapePolicy ?? new NoScrapePolicy(defaultNoScrapePolicy());
        this.deckBatcher = new DeckBatcher();
        this.optionsCacheTtlMs = opts.cache?.ttlMs;
        this.planSearchCache = new PlanSearchCache(undefined, {
            ttlMs: this.optionsCacheTtlMs,
            enabled: opts.cache?.enabled ?? true,
            precision: opts.cache?.precision ?? 3,
            providerName: "router"
        });
        for (const provider of this.providers) {
            const maxConcurrent = this.config?.plans.providers[provider.name]?.budget?.maxConcurrent ?? Number.POSITIVE_INFINITY;
            this.semaphores.set(provider.name, new ProviderSemaphore(maxConcurrent));
        }
    }
    resolveCacheTtlMs(fallbackHit) {
        const ttlMs = this.config?.plans.providers.router?.cache?.ttlMs ?? this.optionsCacheTtlMs ?? 30_000;
        if (fallbackHit) {
            return Math.min(ttlMs, 5_000);
        }
        return ttlMs;
    }
    async search(input, ctx) {
        const started = Date.now();
        const normalizedInput = validateSearchPlansInput(input);
        const cachedDeck = this.planSearchCache.get(normalizedInput, ctx);
        const cacheHit = cachedDeck !== null;
        const logger = ctx?.logger ?? defaultLogger;
        if (cacheHit) {
            logger.info("provider_request_start", {
                requestId: ctx?.requestId,
                provider: "cache",
                module: "providerRouter",
                geo: getGeoCell(normalizedInput),
                radiusMeters: normalizedInput.radiusMeters,
                categories: normalizedInput.categories ?? [],
                openNow: normalizedInput.openNow,
                priceLevelMax: normalizedInput.priceLevelMax,
                hasTimeWindow: normalizedInput.timeWindow !== undefined,
                timeoutMs: 0,
                cacheHit: true,
                sessionHash: getSessionHint(ctx?.sessionId)
            });
            logger.info("provider_request_end", {
                requestId: ctx?.requestId,
                provider: "cache",
                module: "providerRouter",
                ok: true,
                tookMs: Date.now() - started,
                returned: cachedDeck.length,
                retryable: false,
                cacheHit: true
            });
            const affiliateConfig = (ctx?.config ?? this.config)?.affiliate;
            const wrappedCachedDeck = applyAffiliateWrapping(cachedDeck, affiliateConfig, ctx?.sessionId);
            const batchResult = this.deckBatcher.batch(wrappedCachedDeck, {
                cursor: normalizedInput.cursor,
                requestedBatchSize: normalizedInput.limit,
                sessionId: ctx?.sessionId
            });
            const response = {
                plans: batchResult.items,
                nextCursor: batchResult.nextCursor,
                sources: ["cache"]
            };
            if (this.includeDebug) {
                response.debug = {
                    cacheHit: true,
                    calls: [],
                    deduped: { before: cachedDeck.length, after: cachedDeck.length },
                    ranked: { count: cachedDeck.length },
                    tookMs: Date.now() - started
                };
            }
            return response;
        }
        const orderedProviders = this.orderProvidersForInput(normalizedInput);
        const primaryProviders = this.selectPrimaryProviders(orderedProviders);
        const fanoutProviders = this.maxFanout ? primaryProviders.slice(0, this.maxFanout) : primaryProviders;
        const callsDebug = [];
        const providerErrors = [];
        const tasks = fanoutProviders.map(async (provider) => {
            const callStarted = Date.now();
            const providerConfig = (ctx?.config ?? this.config)?.plans.providers[provider.name];
            if (this.enforceNoScrape) {
                try {
                    this.noScrapePolicy.assertProviderAllowed(provider.name);
                }
                catch (error) {
                    if (error instanceof PolicyViolationError) {
                        logger.warn("provider_request_skipped", {
                            requestId: ctx?.requestId,
                            provider: provider.name,
                            module: "providerRouter",
                            reason: "policy_provider_blocked",
                            policyKind: error.details.kind,
                            policyValue: error.details.value
                        });
                        providerErrors.push({ provider: provider.name, error });
                        callsDebug.push({
                            provider: provider.name,
                            tookMs: Date.now() - callStarted,
                            returned: 0,
                            error: {
                                code: "POLICY_PROVIDER_BLOCKED",
                                message: error.message,
                                retryable: false
                            }
                        });
                        if (this.allowPartial) {
                            return null;
                        }
                    }
                    throw error;
                }
            }
            const quotaConfig = providerConfig?.quota;
            const timeoutMs = this.perProviderTimeoutMs[provider.name] ?? this.defaultTimeoutMs;
            if (this.enforceQuotas) {
                this.quotaManager.configure(provider.name, {
                    requestsPerMinute: quotaConfig?.requestsPerMinute,
                    requestsPerDay: quotaConfig?.requestsPerDay,
                    burst: quotaConfig?.burst,
                    costPerRequest: providerConfig?.budget?.requestCost ?? 1
                });
                const decision = this.quotaManager.decide(provider.name, providerConfig?.budget?.requestCost ?? 1);
                if (!decision.allowed) {
                    const reason = decision.reason ?? "rpm";
                    const quotaError = new RateLimitError(provider.name, `Provider quota exceeded (${reason}). ${formatRetryAfterMs(decision.retryAfterMs)}`);
                    logger.warn("provider_request_skipped", {
                        requestId: ctx?.requestId,
                        provider: provider.name,
                        module: "providerRouter",
                        reason: "quota",
                        retryAfterMs: decision.retryAfterMs,
                        sessionHash: getSessionHint(ctx?.sessionId)
                    });
                    logger.warn("provider_request_end", {
                        requestId: ctx?.requestId,
                        provider: provider.name,
                        module: "providerRouter",
                        ok: false,
                        tookMs: Date.now() - callStarted,
                        returned: 0,
                        skippedReason: "quota",
                        retryable: true
                    });
                    providerErrors.push({ provider: provider.name, error: quotaError });
                    callsDebug.push({
                        provider: provider.name,
                        tookMs: Date.now() - callStarted,
                        returned: 0,
                        error: {
                            code: "QUOTA_DENIED",
                            message: quotaError.message,
                            retryable: true,
                            retryAfterMs: decision.retryAfterMs
                        }
                    });
                    if (!(this.allowPartial && this.gracefulOnQuota)) {
                        throw quotaError;
                    }
                    return null;
                }
            }
            if (this.enforceHealth) {
                const healthDecision = this.healthMonitor.shouldSkip(provider.name);
                if (healthDecision.skip) {
                    const retryAfterMs = healthDecision.retryAfterMs;
                    const message = `Provider ${provider.name} temporarily disabled by health monitor. ${formatRetryAfterMs(retryAfterMs)}`;
                    const healthError = new ProviderError({
                        provider: provider.name,
                        code: "HEALTH_DISABLED",
                        message,
                        retryable: true
                    });
                    logger.warn("provider_request_skipped", {
                        requestId: ctx?.requestId,
                        provider: provider.name,
                        module: "providerRouter",
                        reason: "health",
                        retryAfterMs,
                        sessionHash: getSessionHint(ctx?.sessionId)
                    });
                    logger.warn("provider_request_end", {
                        requestId: ctx?.requestId,
                        provider: provider.name,
                        module: "providerRouter",
                        ok: false,
                        tookMs: Date.now() - callStarted,
                        returned: 0,
                        skippedReason: "health",
                        retryable: true
                    });
                    providerErrors.push({ provider: provider.name, error: healthError });
                    callsDebug.push({
                        provider: provider.name,
                        tookMs: Date.now() - callStarted,
                        returned: 0,
                        error: {
                            code: "HEALTH_DISABLED",
                            message,
                            retryable: true,
                            retryAfterMs
                        }
                    });
                    if (!this.allowPartial) {
                        throw healthError;
                    }
                    return null;
                }
            }
            logger.info("provider_request_start", {
                requestId: ctx?.requestId,
                provider: provider.name,
                module: "providerRouter",
                geo: getGeoCell(normalizedInput),
                radiusMeters: normalizedInput.radiusMeters,
                categories: normalizedInput.categories ?? [],
                openNow: normalizedInput.openNow,
                priceLevelMax: normalizedInput.priceLevelMax,
                hasTimeWindow: normalizedInput.timeWindow !== undefined,
                timeoutMs,
                cacheHit: false,
                sessionHash: getSessionHint(ctx?.sessionId)
            });
            const combined = createCombinedController(ctx?.signal, timeoutMs);
            const semaphore = this.semaphores.get(provider.name) ?? new ProviderSemaphore(Number.POSITIVE_INFINITY);
            let release;
            try {
                release = await semaphore.acquire();
            }
            catch (error) {
                const budgetError = asProviderError(provider.name, error);
                logger.warn("provider_request_end", {
                    requestId: ctx?.requestId,
                    provider: provider.name,
                    module: "providerRouter",
                    ok: false,
                    tookMs: Date.now() - callStarted,
                    returned: 0,
                    errorCode: budgetError.code,
                    retryable: budgetError.retryable
                });
                providerErrors.push({ provider: provider.name, error: budgetError });
                callsDebug.push({
                    provider: provider.name,
                    tookMs: Date.now() - callStarted,
                    returned: 0,
                    error: {
                        code: budgetError.code,
                        message: budgetError.message,
                        retryable: budgetError.retryable
                    }
                });
                if (!this.allowPartial) {
                    throw budgetError;
                }
                return null;
            }
            try {
                const result = await provider.searchPlans(normalizedInput, {
                    ...ctx,
                    config: ctx?.config ?? this.config,
                    signal: combined.controller.signal,
                    timeoutMs
                });
                const tookMs = Date.now() - callStarted;
                callsDebug.push({
                    provider: provider.name,
                    tookMs,
                    returned: result.plans.length
                });
                logger.info("provider_request_end", {
                    requestId: ctx?.requestId,
                    provider: provider.name,
                    module: "providerRouter",
                    ok: true,
                    tookMs,
                    returned: result.plans.length,
                    retryable: false
                });
                if (this.enforceHealth) {
                    this.healthMonitor.record({
                        provider: provider.name,
                        ok: true,
                        tookMs,
                        returned: result.plans.length
                    });
                }
                return result;
            }
            catch (error) {
                const wrapped = combined.didTimeout()
                    ? new TimeoutError(provider.name, `Provider ${provider.name} timed out after ${timeoutMs}ms`, error)
                    : asProviderError(provider.name, error);
                const tookMs = Date.now() - callStarted;
                providerErrors.push({ provider: provider.name, error: wrapped });
                callsDebug.push({
                    provider: provider.name,
                    tookMs,
                    returned: 0,
                    error: {
                        code: wrapped.code,
                        message: wrapped.message,
                        retryable: wrapped.retryable
                    }
                });
                logger.warn("provider_request_end", {
                    requestId: ctx?.requestId,
                    provider: provider.name,
                    module: "providerRouter",
                    ok: false,
                    tookMs,
                    returned: 0,
                    errorCode: wrapped.code,
                    retryable: wrapped.retryable
                });
                if (this.enforceHealth) {
                    this.healthMonitor.record({
                        provider: provider.name,
                        ok: false,
                        tookMs,
                        returned: 0,
                        errorCode: wrapped.code ?? "UNKNOWN",
                        retryable: wrapped.retryable
                    });
                }
                if (!this.allowPartial) {
                    throw wrapped;
                }
                return null;
            }
            finally {
                release?.();
                combined.cleanup();
            }
        });
        let results;
        try {
            results = await Promise.all(tasks);
        }
        catch (error) {
            const providerError = asProviderError("router", error);
            throw new ProviderError({
                provider: "router",
                code: providerError.code,
                retryable: providerError.retryable,
                message: `Provider fanout failed: ${providerError.message}`,
                cause: error
            });
        }
        const mergedPlans = results.flatMap((result) => result?.plans ?? []);
        let policyDroppedPlans = 0;
        const policyFilteredPlans = this.enforceNoScrape
            ? mergedPlans.filter((plan) => {
                try {
                    this.noScrapePolicy.assertPlanSourceAllowed(plan.source);
                    return true;
                }
                catch (error) {
                    if (error instanceof PolicyViolationError) {
                        policyDroppedPlans += 1;
                        logger.warn("policy_violation", {
                            module: "providerRouter",
                            kind: error.details.kind,
                            value: error.details.value,
                            provider: "router"
                        });
                        return false;
                    }
                    throw error;
                }
            })
            : mergedPlans;
        if (this.enforceNoScrape && policyFilteredPlans.length === 0 && mergedPlans.length > 0 && !this.allowPartial) {
            throw new PolicyViolationError("All plans were blocked by no-scrape policy", {
                kind: "plan_source",
                value: "all"
            });
        }
        const fallback = await applyNeverEmptyFallback({
            input: normalizedInput,
            ctx,
            basePlans: policyFilteredPlans,
            providers: orderedProviders,
            providerErrors,
            opts: {
                ...this.neverEmpty,
                includeDebug: this.includeDebug
            }
        });
        const validatedPlans = validatePlanArray(fallback.plans);
        const dedupedPlans = dedupePlans(validatedPlans);
        const rankedPlans = rankPlansAdvanced(dedupedPlans, { input: normalizedInput, now: new Date(), signals: ctx?.ranking }).plans;
        const boosted = applyColdStartBooster(rankedPlans, { input: normalizedInput, signals: ctx?.ranking }, { includeDebug: this.includeDebug });
        const sponsored = applySponsoredPlacement(boosted.plans, { input: normalizedInput }, {
            ...this.sponsoredPlacement,
            includeDebug: this.includeDebug || this.sponsoredPlacement?.includeDebug
        });
        const cacheTtlMs = this.resolveCacheTtlMs(fallback.debug?.triggered ?? false);
        if (!ctx?.signal?.aborted) {
            this.planSearchCache.set(normalizedInput, ctx, sponsored.plans, cacheTtlMs);
        }
        const affiliateConfig = (ctx?.config ?? this.config)?.affiliate;
        const wrappedPlans = applyAffiliateWrapping(sponsored.plans, affiliateConfig, ctx?.sessionId);
        const batchResult = this.deckBatcher.batch(wrappedPlans, {
            cursor: normalizedInput.cursor,
            requestedBatchSize: normalizedInput.limit,
            sessionId: ctx?.sessionId
        });
        const response = {
            plans: batchResult.items,
            nextCursor: batchResult.nextCursor,
            sources: fanoutProviders.map((provider) => provider.name)
        };
        if (this.includeDebug) {
            response.debug = {
                cacheHit: false,
                calls: callsDebug,
                deduped: { before: validatedPlans.length, after: dedupedPlans.length },
                ranked: { count: rankedPlans.length },
                booster: boosted.debug,
                sponsored: sponsored.debug,
                fallback: fallback.debug,
                policyDroppedPlans,
                tookMs: Date.now() - started
            };
        }
        return response;
    }
    getHealthSnapshots() {
        return this.healthMonitor.snapshots();
    }
    invalidateCache(params) {
        return this.planSearchCache.invalidate(params);
    }
    selectPrimaryProviders(providers) {
        const fallbackProviderNames = new Set([
            this.neverEmpty.curatedProviderName ?? "curated",
            this.neverEmpty.byoProviderName ?? "byo"
        ]);
        return providers.filter((provider) => !fallbackProviderNames.has(provider.name));
    }
    orderProvidersForInput(input) {
        let providers = this.providers.filter((provider) => this.config?.plans.providers[provider.name]?.routing?.enabled !== false);
        const primaryCategory = getPrimaryCategory(input);
        if (primaryCategory) {
            const explicitOrder = this.config?.plans.router.perCategoryProviderOrder?.[primaryCategory];
            if (explicitOrder?.length) {
                const scoreByProvider = new Map(explicitOrder.map((name, idx) => [name, explicitOrder.length - idx]));
                providers = [...providers].sort((a, b) => (scoreByProvider.get(b.name) ?? 0) - (scoreByProvider.get(a.name) ?? 0));
            }
        }
        return providers;
    }
}

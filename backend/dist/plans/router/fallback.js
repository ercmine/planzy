import { ProviderError } from "../errors.js";
import { isAbortError } from "../provider.js";
import { validateSearchPlansInput } from "../validation.js";
const DEFAULT_MIN_RESULTS = 25;
const DEFAULT_HARD_MIN_RESULTS = 10;
const DEFAULT_MAX_BACKFILL = 60;
const DEFAULT_CURATED_PROVIDER = "curated";
const DEFAULT_BYO_PROVIDER = "byo";
function asAbortedError(error) {
    if (error instanceof ProviderError && error.code === "ABORTED") {
        return error;
    }
    return new ProviderError({
        provider: "router",
        code: "ABORTED",
        message: "Fallback aborted",
        retryable: true,
        cause: error
    });
}
function sanitizeError(provider, error) {
    if (error instanceof ProviderError) {
        return { provider, code: error.code, message: error.message };
    }
    if (error instanceof Error) {
        return { provider, code: "UNKNOWN", message: error.message };
    }
    return { provider, code: "UNKNOWN", message: "Unknown provider error" };
}
function maybeAddPlans(params) {
    let added = 0;
    for (const plan of params.incoming) {
        if (added >= params.remainingBudget) {
            break;
        }
        if (params.seenIds.has(plan.id)) {
            continue;
        }
        params.current.push(plan);
        params.seenIds.add(plan.id);
        added += 1;
    }
    return added;
}
export async function applyNeverEmptyFallback(params) {
    const enabled = params.opts?.enabled ?? true;
    const minResults = params.opts?.minResults ?? DEFAULT_MIN_RESULTS;
    const hardMinResults = params.opts?.hardMinResults ?? DEFAULT_HARD_MIN_RESULTS;
    const maxBackfill = Math.max(0, params.opts?.maxBackfill ?? DEFAULT_MAX_BACKFILL);
    const preferByoFirst = params.opts?.preferByoFirst ?? true;
    const curatedProviderName = params.opts?.curatedProviderName ?? DEFAULT_CURATED_PROVIDER;
    const byoProviderName = params.opts?.byoProviderName ?? DEFAULT_BYO_PROVIDER;
    const includeDebug = params.opts?.includeDebug ?? false;
    const validatedInput = validateSearchPlansInput(params.input);
    const initialCount = params.basePlans.length;
    const requestedLimit = validatedInput.limit ?? 50;
    const triggerByHardMin = initialCount < hardMinResults && requestedLimit >= hardMinResults;
    const shouldTrigger = enabled && (initialCount === 0 || initialCount < minResults || triggerByHardMin);
    const errors = params.providerErrors.map(({ provider, error }) => sanitizeError(provider, error));
    const fallbackNames = new Set([curatedProviderName, byoProviderName]);
    const nonFallbackProviders = params.providers.filter((provider) => !fallbackNames.has(provider.name));
    const nonFallbackNames = new Set(nonFallbackProviders.map((provider) => provider.name));
    const failedNonFallbacks = new Set(params.providerErrors
        .filter(({ provider }) => nonFallbackNames.has(provider))
        .map(({ provider }) => provider));
    const allNonFallbackFailed = nonFallbackProviders.length > 0 && failedNonFallbacks.size === nonFallbackProviders.length;
    let reason;
    if (shouldTrigger) {
        if (initialCount === 0 && allNonFallbackFailed) {
            reason = "all_failed";
        }
        else if (initialCount === 0) {
            reason = "empty";
        }
        else {
            reason = "too_few";
        }
    }
    const debug = {
        triggered: shouldTrigger,
        reason,
        initialCount,
        afterByoCount: initialCount,
        afterCuratedCount: initialCount,
        byoUsed: false,
        curatedUsed: false,
        errors
    };
    if (!shouldTrigger || maxBackfill === 0) {
        return includeDebug ? { plans: params.basePlans, debug } : { plans: params.basePlans };
    }
    if (params.ctx?.signal?.aborted) {
        throw asAbortedError(params.ctx.signal.reason);
    }
    const byoProvider = params.providers.find((provider) => provider.name === byoProviderName);
    const curatedProvider = params.providers.find((provider) => provider.name === curatedProviderName);
    const order = preferByoFirst
        ? [
            { key: "byo", provider: byoProvider },
            { key: "curated", provider: curatedProvider }
        ]
        : [
            { key: "curated", provider: curatedProvider },
            { key: "byo", provider: byoProvider }
        ];
    const combinedPlans = [...params.basePlans];
    const seenIds = new Set(params.basePlans.map((plan) => plan.id));
    let addedBackfill = 0;
    for (const entry of order) {
        if (!entry.provider || addedBackfill >= maxBackfill) {
            continue;
        }
        if (params.ctx?.signal?.aborted) {
            throw asAbortedError(params.ctx.signal.reason);
        }
        try {
            const fallbackResult = await entry.provider.searchPlans(params.input, params.ctx);
            const added = maybeAddPlans({
                incoming: fallbackResult.plans,
                current: combinedPlans,
                seenIds,
                remainingBudget: maxBackfill - addedBackfill
            });
            addedBackfill += added;
            if (entry.key === "byo") {
                debug.byoUsed = added > 0;
                debug.afterByoCount = combinedPlans.length;
            }
            else {
                debug.curatedUsed = added > 0;
                debug.afterCuratedCount = combinedPlans.length;
            }
        }
        catch (error) {
            if (isAbortError(error) || params.ctx?.signal?.aborted) {
                throw asAbortedError(error);
            }
            errors.push(sanitizeError(entry.provider.name, error));
            if (entry.key === "byo") {
                debug.afterByoCount = combinedPlans.length;
            }
            else {
                debug.afterCuratedCount = combinedPlans.length;
            }
        }
    }
    return includeDebug ? { plans: combinedPlans, debug } : { plans: combinedPlans };
}

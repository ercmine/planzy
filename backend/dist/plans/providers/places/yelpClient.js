import { ProviderError, RateLimitError, TimeoutError } from "../../errors.js";
import { isAbortError } from "../../provider.js";
import { NoScrapePolicy, defaultNoScrapePolicy } from "../../../policy/noScrapePolicy.js";
import { createPolicyFetch } from "../../../policy/policyFetch.js";
const YELP_SEARCH_URL = "https://api.yelp.com/v3/businesses/search";
function createCombinedController(signal, timeoutMs) {
    const controller = new AbortController();
    let timeoutTriggered = false;
    const onAbort = () => controller.abort(signal?.reason);
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
        controller.abort(new DOMException("Request timed out", "AbortError"));
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
export class YelpClient {
    cfg;
    fetchFn;
    constructor(cfg, opts) {
        this.cfg = cfg;
        const policy = opts?.policy ?? new NoScrapePolicy(defaultNoScrapePolicy());
        this.fetchFn = createPolicyFetch({ policy, kind: "api", fetchFn: opts?.fetchFn ?? fetch });
    }
    async search(params, ctx) {
        const combined = createCombinedController(ctx?.signal, this.cfg.timeoutMs);
        const limit = Math.max(1, Math.min(50, params.limit ?? this.cfg.limit));
        const radius = Math.max(1, Math.min(40_000, Math.round(params.radiusMeters)));
        const query = new URLSearchParams({
            latitude: String(params.lat),
            longitude: String(params.lng),
            radius: String(radius),
            limit: String(limit),
            offset: String(Math.max(0, params.offset ?? 0))
        });
        if (params.term) {
            query.set("term", params.term);
        }
        if (params.categories?.length) {
            query.set("categories", params.categories.join(","));
        }
        if (params.openNow !== undefined) {
            query.set("open_now", String(params.openNow));
        }
        if (params.priceLevelMax !== undefined) {
            const tiers = Array.from({ length: params.priceLevelMax }, (_, idx) => String(idx + 1));
            if (tiers.length > 0) {
                query.set("price", tiers.join(","));
            }
        }
        try {
            const response = await this.fetchFn(`${YELP_SEARCH_URL}?${query.toString()}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.cfg.apiKey}`
                },
                signal: combined.controller.signal
            });
            if (!response.ok) {
                if (response.status === 429) {
                    throw new RateLimitError("yelp");
                }
                if (response.status === 408 || response.status === 504) {
                    throw new TimeoutError("yelp");
                }
                throw new ProviderError({
                    provider: "yelp",
                    code: `HTTP_${response.status}`,
                    message: `Yelp request failed with status ${response.status}`,
                    retryable: false
                });
            }
            const body = (await response.json());
            return {
                businesses: body.businesses?.filter((item) => typeof item.id === "string") ?? [],
                total: body.total
            };
        }
        catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }
            if (combined.didTimeout() || isAbortError(error)) {
                throw new TimeoutError("yelp", "Yelp request timed out", error);
            }
            throw new ProviderError({
                provider: "yelp",
                code: "HTTP_ERROR",
                message: "Yelp request failed",
                retryable: false,
                cause: error
            });
        }
        finally {
            combined.cleanup();
        }
    }
}

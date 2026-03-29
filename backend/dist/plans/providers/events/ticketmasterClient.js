import { ProviderError, RateLimitError, TimeoutError } from "../../errors.js";
import { isAbortError } from "../../provider.js";
import { NoScrapePolicy, defaultNoScrapePolicy } from "../../../policy/noScrapePolicy.js";
import { createPolicyFetch } from "../../../policy/policyFetch.js";
const TICKETMASTER_EVENTS_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
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
function clampSize(size) {
    return Math.max(1, Math.min(50, Math.round(size)));
}
export class TicketmasterClient {
    cfg;
    fetchFn;
    constructor(cfg, opts) {
        this.cfg = {
            ...cfg,
            timeoutMs: Math.max(1, cfg.timeoutMs),
            size: clampSize(cfg.size)
        };
        const policy = opts?.policy ?? new NoScrapePolicy(defaultNoScrapePolicy());
        this.fetchFn = createPolicyFetch({ policy, kind: "api", fetchFn: opts?.fetchFn ?? fetch });
    }
    async search(params, ctx) {
        const combined = createCombinedController(ctx?.signal, this.cfg.timeoutMs);
        const url = new URL(TICKETMASTER_EVENTS_URL);
        const query = url.searchParams;
        query.set("apikey", this.cfg.apiKey);
        query.set("latlong", `${params.lat},${params.lng}`);
        query.set("radius", String(Math.max(1, Math.min(100, Math.round(params.radiusMiles)))));
        query.set("unit", "miles");
        query.set("size", String(clampSize(params.size ?? this.cfg.size)));
        query.set("page", String(Math.max(0, Math.round(params.page ?? 0))));
        if (params.startDateTimeISO) {
            query.set("startDateTime", params.startDateTimeISO);
        }
        if (params.endDateTimeISO) {
            query.set("endDateTime", params.endDateTimeISO);
        }
        if (params.classificationName) {
            query.set("classificationName", params.classificationName);
        }
        if (params.keyword) {
            query.set("keyword", params.keyword);
        }
        try {
            const response = await this.fetchFn(url.toString(), {
                method: "GET",
                signal: combined.controller.signal
            });
            if (!response.ok) {
                if (response.status === 429) {
                    throw new RateLimitError("ticketmaster");
                }
                throw new ProviderError({
                    provider: "ticketmaster",
                    code: `HTTP_${response.status}`,
                    message: `Ticketmaster request failed with status ${response.status}`,
                    retryable: false
                });
            }
            const body = (await response.json());
            const events = body._embedded?.events ?? [];
            return events
                .filter((event) => typeof event.id === "string")
                .map((event) => ({
                id: event.id,
                name: event.name,
                url: event.url,
                images: event.images,
                dates: event.dates,
                classifications: event.classifications,
                priceRanges: event.priceRanges,
                _embedded: event._embedded
            }));
        }
        catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }
            if (combined.didTimeout() || isAbortError(error)) {
                throw new TimeoutError("ticketmaster", "Ticketmaster request timed out", error);
            }
            throw new ProviderError({
                provider: "ticketmaster",
                code: "HTTP_ERROR",
                message: "Ticketmaster request failed",
                retryable: false,
                cause: error
            });
        }
        finally {
            combined.cleanup();
        }
    }
}

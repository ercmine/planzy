import { ProviderError, RateLimitError, TimeoutError } from "../../errors.js";
import { isAbortError } from "../../provider.js";
import { NoScrapePolicy, defaultNoScrapePolicy } from "../../../policy/noScrapePolicy.js";
import { createPolicyFetch } from "../../../policy/policyFetch.js";

const TICKETMASTER_EVENTS_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

export interface TicketmasterConfig {
  apiKey: string;
  timeoutMs: number;
  size: number;
}

export interface TicketmasterSearchParams {
  lat: number;
  lng: number;
  radiusMiles: number;
  startDateTimeISO?: string;
  endDateTimeISO?: string;
  classificationName?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface TicketmasterEventLite {
  id: string;
  name?: string;
  url?: string;
  images?: Array<{ url?: string; width?: number; height?: number; ratio?: string }>;
  dates?: {
    start?: {
      dateTime?: string;
    };
  };
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
    subGenre?: { name?: string };
    type?: { name?: string };
    subType?: { name?: string };
  }>;
  priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      location?: { latitude?: string; longitude?: string };
      address?: { line1?: string };
      city?: { name?: string };
      state?: { stateCode?: string };
      postalCode?: string;
    }>;
  };
}

interface TicketmasterSearchResponse {
  _embedded?: {
    events?: Array<{
      id?: string;
      name?: string;
      url?: string;
      images?: Array<{ url?: string; width?: number; height?: number; ratio?: string }>;
      dates?: {
        start?: {
          dateTime?: string;
        };
      };
      classifications?: Array<{
        segment?: { name?: string };
        genre?: { name?: string };
        subGenre?: { name?: string };
        type?: { name?: string };
        subType?: { name?: string };
      }>;
      priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
      _embedded?: {
        venues?: Array<{
          name?: string;
          location?: { latitude?: string; longitude?: string };
          address?: { line1?: string };
          city?: { name?: string };
          state?: { stateCode?: string };
          postalCode?: string;
        }>;
      };
    }>;
  };
}

function createCombinedController(signal: AbortSignal | undefined, timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timeoutTriggered = false;

  const onAbort = (): void => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
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

function clampSize(size: number): number {
  return Math.max(1, Math.min(50, Math.round(size)));
}

export class TicketmasterClient {
  private readonly cfg: TicketmasterConfig;
  private readonly fetchFn: typeof fetch;

  constructor(cfg: TicketmasterConfig, opts?: { fetchFn?: typeof fetch; policy?: NoScrapePolicy }) {
    this.cfg = {
      ...cfg,
      timeoutMs: Math.max(1, cfg.timeoutMs),
      size: clampSize(cfg.size)
    };
    const policy = opts?.policy ?? new NoScrapePolicy(defaultNoScrapePolicy());
    this.fetchFn = createPolicyFetch({ policy, kind: "api", fetchFn: opts?.fetchFn ?? fetch });
  }

  public async search(params: TicketmasterSearchParams, ctx?: { signal?: AbortSignal }): Promise<TicketmasterEventLite[]> {
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

      const body = (await response.json()) as TicketmasterSearchResponse;
      const events = body._embedded?.events ?? [];
      return events
        .filter((event): event is { id: string } & NonNullable<typeof events>[number] => typeof event.id === "string")
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
    } catch (error) {
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
    } finally {
      combined.cleanup();
    }
  }
}
